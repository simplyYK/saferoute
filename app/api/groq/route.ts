import { NextRequest } from "next/server";
import { AGENT_TOOLS } from "@/lib/agent-tools-schema";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are **Sentinel AI**, a crisis intelligence analyst embedded in a life-saving platform for civilians in conflict zones. Your primary mission is to keep the user alive and help them reach safety.

PERSONA: You are calm, direct, and authoritative — like a field intelligence officer speaking to a civilian. No filler, no hedging. Every second matters. When there is danger, lead with the action.

TRIAGE PROTOCOL — If the user mentions immediate danger, gunfire, explosions, being trapped, or any life-threatening situation:
1. **IMMEDIATE ACTION** — one sentence telling them exactly what to do RIGHT NOW (e.g., "Get to the ground floor and away from windows")
2. **Emergency number** — provide the local emergency number for their region
3. **Detailed analysis** — then give context, nearby resources, or route options

PROACTIVE WARNINGS: When tool results reveal threats near the user (conflict events < 10km, military aircraft overhead, poor air quality, thermal hotspots), ALWAYS mention them even if the user didn't ask. Preface with "⚠️ THREAT DETECTED:" and explain what it means in plain language.

CAPABILITIES (via tools — you MUST use tools for live data, never fabricate):
- Search for any place/address and navigate the map there
- Find nearby resources (hospitals, shelters, pharmacies, police, embassies)
- Calculate safe routes between locations with safety scoring
- Get live air quality data, elevation, timezone info
- Access real-time conflict events, seismic data, flight tracking, military aircraft, news, thermal hotspots
- Control the map: fly to locations, toggle layers, change visual modes
- Plan routes and submit community reports on behalf of the user

TOOL USAGE RULES:
1. When the user asks about threats, resources, routes — ALWAYS call the relevant tool(s) first to get real data
2. You can call multiple tools in parallel when the user's question needs different data sources
3. For "nearest hospital" type queries: use find_nearby_resources with the user's GPS coordinates
4. For route requests: first search_places for any named locations, then compute_route with coordinates
5. For "show me X on the map": use fly_to_location after getting coordinates
6. After getting tool results, synthesize the data into a clear, actionable briefing
7. When showing the user a place, ALWAYS call fly_to_location so they can see it on the map

DATA TRANSLATION — Make raw data actionable for a civilian:
- Thermal hotspots → "Thermal anomaly detected X km from you — may indicate fires, industrial activity, or conflict-related events. Avoid this area"
- Military aircraft → "X military aircraft detected overhead — this may indicate active operations"
- Seismic + conflict zone → "Seismic activity near conflict zone — may indicate heavy artillery"
- AQI > 150 → "Air quality is unhealthy (AQI X) — cover nose and mouth if moving outdoors"
- Commercial flights active → "Commercial airspace is operating — no immediate closure"

SAFETY-FIRST RULES:
- Never speculate beyond available data
- Respond in the user's language. Be concise under stress
- Always recommend contacting ICRC (icrc.org), UNHCR, or local emergency services when relevant
- If a route has a low safety score (< 50), warn the user explicitly and suggest alternatives
- When in doubt, err on the side of caution`;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

type Msg = { role: "user" | "assistant" | "tool"; content: string; tool_calls?: ToolCall[]; tool_call_id?: string; name?: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

function contextBlock(context: Record<string, unknown> | undefined): string {
  if (!context || Object.keys(context).length === 0) return "";
  try {
    return `\n\nCurrent operational context (use only as provided; do not invent numbers):\n${JSON.stringify(context, null, 2)}`;
  } catch {
    return "";
  }
}

function isRealKey(k: string | undefined, prefix: string): k is string {
  return !!k && k.startsWith(prefix) && !k.includes("your-");
}

function getProvider():
  | { kind: "groq"; key: string }
  | { kind: "openai"; key: string }
  | { kind: "gemini"; key: string }
  | null {
  const o = process.env.OPENAI_API_KEY;
  if (isRealKey(o, "sk-")) return { kind: "openai", key: o };
  const g = process.env.GROQ_API_KEY;
  if (isRealKey(g, "gsk_")) return { kind: "groq", key: g };
  const m = process.env.GEMINI_API_KEY;
  if (isRealKey(m, "AIza")) return { kind: "gemini", key: m };
  return null;
}

const langNames: Record<string, string> = {
  en: "English", uk: "Ukrainian", ar: "Arabic", fr: "French", es: "Spanish", my: "Burmese",
};

function buildSystemPrompt(language: string, context: Record<string, unknown> | undefined): string {
  const langName = langNames[language] || "English";
  return `${SYSTEM_PROMPT}${contextBlock(context)}\n\nUser language: ${langName}. Respond in ${langName} unless they write in another language.`;
}

function sseLine(obj: unknown): string {
  if (obj === "[DONE]") return "data: [DONE]\n\n";
  return `data: ${JSON.stringify(obj)}\n\n`;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function executeToolCalls(toolCalls: ToolCall[]): Promise<{ tool_call_id: string; name: string; result: unknown }[]> {
  const results = await Promise.all(
    toolCalls.map(async (tc) => {
      try {
        const args = JSON.parse(tc.function.arguments);
        const res = await fetch(`${BASE_URL}/api/agent-tools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tools: [{ name: tc.function.name, args }] }),
        });
        const data = await res.json() as { results?: Array<{ result?: unknown; error?: string }> };
        return {
          tool_call_id: tc.id,
          name: tc.function.name,
          result: data.results?.[0]?.result ?? data.results?.[0]?.error ?? "No result",
        };
      } catch (err) {
        return { tool_call_id: tc.id, name: tc.function.name, result: { error: String(err) } };
      }
    })
  );
  return results;
}

// Truncate large tool results to avoid token limits
function truncateResult(result: unknown): string {
  const str = JSON.stringify(result);
  if (str.length <= 4000) return str;
  // For arrays, take first few items
  if (Array.isArray(result)) {
    const truncated = result.slice(0, 10);
    return JSON.stringify({ items: truncated, total: result.length, truncated: true });
  }
  // For objects with arrays inside
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    const trimmed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v) && v.length > 10) {
        trimmed[k] = v.slice(0, 10);
        trimmed[`${k}_total`] = v.length;
      } else {
        trimmed[k] = v;
      }
    }
    const s = JSON.stringify(trimmed);
    return s.length > 4000 ? s.slice(0, 4000) + "..." : s;
  }
  return str.slice(0, 4000) + "...";
}

async function callOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Msg[],
  authHeader: string,
  stream: boolean,
  includeTools: boolean
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-20)],
    temperature: 0.3,
    max_tokens: 2048,
    stream,
  };
  if (includeTools) {
    body.tools = AGENT_TOOLS;
    body.tool_choice = "auto";
  }

  return fetch(url, {
    method: "POST",
    headers: { [authHeader.includes("Bearer") ? "Authorization" : "X-Goog-Api-Key"]: authHeader.includes("Bearer") ? authHeader : apiKey, "Content-Type": "application/json", ...(authHeader.includes("Bearer") ? {} : {}) },
    body: JSON.stringify(body),
  });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait." }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }

  const provider = getProvider();
  if (!provider) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503, headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json() as {
    messages: Msg[];
    language?: string;
    context?: Record<string, unknown>;
  };
  const { messages, language = "en", context } = body;

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Messages required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildSystemPrompt(language, context);

  try {
    let apiUrl: string;
    let model: string;
    let authHeader: string;

    switch (provider.kind) {
      case "openai":
        apiUrl = "https://api.openai.com/v1/chat/completions";
        model = "gpt-4o-mini";
        authHeader = `Bearer ${provider.key}`;
        break;
      case "groq":
        apiUrl = "https://api.groq.com/openai/v1/chat/completions";
        model = "llama-3.3-70b-versatile";
        authHeader = `Bearer ${provider.key}`;
        break;
      case "gemini": {
        // Gemini doesn't support OpenAI tool calling format — use non-streaming with manual tool loop
        return handleGemini(provider.key, systemPrompt, messages);
      }
    }

    // Non-streaming tool call loop for OpenAI/Groq
    let conversationMessages = [...messages];
    let maxLoops = 5;
    const encoder = new TextEncoder();
    const clientActions: unknown[] = [];

    // We do a tool loop: keep calling the model until it gives a final text response
    while (maxLoops-- > 0) {
      const res = await callOpenAICompatible(apiUrl, provider.key, model, systemPrompt, conversationMessages, authHeader, false, true);
      if (!res.ok) {
        if (res.status === 429) throw new Error("RATE_LIMIT");
        throw new Error(`${provider.kind} ${res.status}: ${await res.text()}`);
      }

      const data = await res.json() as {
        choices: Array<{
          message: {
            role: string;
            content: string | null;
            tool_calls?: ToolCall[];
          };
          finish_reason: string;
        }>;
      };

      const choice = data.choices[0];
      if (!choice) throw new Error("No response from model");

      const assistantMsg = choice.message;

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        // Model wants to call tools
        conversationMessages.push({
          role: "assistant",
          content: assistantMsg.content ?? "",
          tool_calls: assistantMsg.tool_calls,
        });

        // Execute tool calls
        const toolResults = await executeToolCalls(assistantMsg.tool_calls);

        // Check for client-side actions
        for (const tr of toolResults) {
          const res = tr.result as Record<string, unknown> | undefined;
          if (res && typeof res === "object" && "action" in res) {
            clientActions.push(res);
          }
        }

        // Add tool results to conversation
        for (const tr of toolResults) {
          conversationMessages.push({
            role: "tool",
            tool_call_id: tr.tool_call_id,
            name: tr.name,
            content: truncateResult(tr.result),
          });
        }

        continue; // Loop back to model with tool results
      }

      // No tool calls — model has a final response. Stream it back.
      const finalContent = assistantMsg.content ?? "";

      const stream = new ReadableStream({
        start(controller) {
          // Send client actions first
          if (clientActions.length > 0) {
            controller.enqueue(encoder.encode(sseLine({ actions: clientActions })));
          }
          // Stream the text in chunks
          const words = finalContent.split(" ");
          for (let i = 0; i < words.length; i += 4) {
            const chunk = words.slice(i, i + 4).join(" ") + (i + 4 < words.length ? " " : "");
            controller.enqueue(encoder.encode(sseLine({ content: chunk })));
          }
          controller.enqueue(encoder.encode(sseLine("[DONE]")));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // If we hit max loops, return what we have
    return new Response(
      JSON.stringify({ error: "Agent reached maximum tool call depth" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[AI route]", err);
    if (err instanceof Error && err.message === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "AI service is busy. Try again shortly." }), {
        status: 429, headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "AI service error" }), {
      status: 502, headers: { "Content-Type": "application/json" },
    });
  }
}

// Gemini fallback — no tool calling, just enhanced system prompt
async function handleGemini(apiKey: string, systemPrompt: string, messages: Msg[]) {
  const contents = messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-10).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`Gemini ${res.status}`);
  }
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const words = text.split(" ");
      for (let i = 0; i < words.length; i += 5) {
        const chunk = words.slice(i, i + 5).join(" ") + (i + 5 < words.length ? " " : "");
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
