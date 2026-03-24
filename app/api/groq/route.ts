import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are an intelligence analyst for SafeRoute, a humanitarian crisis navigation platform.
You have access to real-time data: conflict events from ACLED, crowdsourced civilian reports, live flight tracking (OpenSky + ADSB military), seismic activity (USGS), and satellite positions (Celestrak).

Your mission: help civilians survive and help coordinators/journalists understand the situation on the ground. You provide:
- Tactical navigation advice (when asked about routes or movement)
- Threat assessment (interpreting flight patterns, seismic spikes near conflict)
- Medical triage guidance (first aid, stabilization)
- Resource location (shelters, water, hospitals in the area)
- Evacuation planning (corridors, timing, what to bring)

Always prioritize civilian safety. Never speculate beyond available data.
Respond in the user's language. Be concise under stress.
Always recommend contacting ICRC (icrc.org), UNHCR, or local emergency services when relevant.
Start urgent responses with "IMMEDIATE ACTION:" followed by what to do RIGHT NOW.`;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

interface AiContext {
  country?: string;
  activeReports?: number;
  nearbyFlights?: number;
  recentSeismic?: number;
}

function buildContextString(ctx: AiContext): string {
  const parts: string[] = [];
  if (ctx.country) parts.push(`Region of interest: ${ctx.country}`);
  if (ctx.activeReports != null) parts.push(`Active community reports: ${ctx.activeReports}`);
  if (ctx.nearbyFlights != null) parts.push(`Flights currently tracked: ${ctx.nearbyFlights}`);
  if (ctx.recentSeismic != null) parts.push(`Seismic events (24h): ${ctx.recentSeismic}`);
  return parts.length ? `[Current intelligence context]\n${parts.join("\n")}\n` : "";
}

// ── Groq (SSE passthrough) ─────────────────────────────────────────────────
async function streamGroq(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<Response> {
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-10)],
      temperature: 0.3,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!groqRes.ok) {
    if (groqRes.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`Groq ${groqRes.status}`);
  }

  return groqRes;
}

// ── OpenAI (SSE passthrough) ───────────────────────────────────────────────
async function streamOpenAI(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<Response> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-10)],
      temperature: 0.3,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`OpenAI ${res.status}`);
  }

  return res;
}

// ── Gemini (non-streaming → emulate SSE) ──────────────────────────────────
async function streamGemini(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<ReadableStream> {
  const contents = messages.slice(-10).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
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
  return new ReadableStream({
    start(controller) {
      // Chunk the text to simulate streaming
      const words = text.split(" ");
      for (let i = 0; i < words.length; i += 5) {
        const chunk = words.slice(i, i + 5).join(" ") + (i + 5 < words.length ? " " : "");
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

// ── SSE pipe for OpenAI-compatible streams (Groq / OpenAI) ────────────────
function pipeOpenAIStream(upstream: Response): ReadableStream {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) { controller.close(); return; }
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch { /* skip */ }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !openaiKey && !geminiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json() as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    language?: string;
    context?: AiContext;
  };
  const { messages, language = "en", context } = body;

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const langNames: Record<string, string> = {
    en: "English", uk: "Ukrainian", ar: "Arabic", fr: "French", es: "Spanish", my: "Burmese",
  };
  const langName = langNames[language] || "English";
  const contextStr = context ? buildContextString(context) : "";
  const systemPrompt = `${SYSTEM_PROMPT}\n\nUser language: ${langName}. Respond in ${langName} unless they write in another language.${contextStr ? `\n\n${contextStr}` : ""}`;

  try {
    let stream: ReadableStream;

    if (groqKey) {
      const upstream = await streamGroq(messages, systemPrompt);
      stream = pipeOpenAIStream(upstream);
    } else if (openaiKey) {
      const upstream = await streamOpenAI(messages, systemPrompt);
      stream = pipeOpenAIStream(upstream);
    } else {
      stream = await streamGemini(messages, systemPrompt);
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[AI]", err);
    if (err instanceof Error && err.message === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "AI service is busy. Try again shortly." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "AI service error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
