import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

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
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

type Msg = { role: "user" | "assistant"; content: string };

function contextBlock(context: Record<string, unknown> | undefined): string {
  if (!context || Object.keys(context).length === 0) return "";
  try {
    return `\n\nCurrent operational context (use only as provided; do not invent numbers):\n${JSON.stringify(context, null, 2)}`;
  } catch {
    return "";
  }
}

function getProvider():
  | { kind: "groq"; key: string }
  | { kind: "openai"; key: string }
  | { kind: "gemini"; key: string }
  | null {
  const g = process.env.GROQ_API_KEY;
  if (g) return { kind: "groq", key: g };
  const o = process.env.OPENAI_API_KEY;
  if (o) return { kind: "openai", key: o };
  const m = process.env.GEMINI_API_KEY;
  if (m) return { kind: "gemini", key: m };
  return null;
}

const langNames: Record<string, string> = {
  en: "English", uk: "Ukrainian", ar: "Arabic", fr: "French", es: "Spanish", my: "Burmese",
};

function buildSystemPrompt(language: string, context: Record<string, unknown> | undefined): string {
  const langName = langNames[language] || "English";
  return `${SYSTEM_PROMPT}${contextBlock(context)}\n\nUser language: ${langName}. Respond in ${langName} unless they write in another language.`;
}

function sseLine(obj: { content: string } | "[DONE]"): string {
  if (obj === "[DONE]") return "data: [DONE]\n\n";
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function pipeOpenAICompatibleStream(upstream: Response): ReadableStream<Uint8Array> {
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
            if (data === "[DONE]") { controller.enqueue(encoder.encode(sseLine("[DONE]"))); continue; }
            try {
              const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) controller.enqueue(encoder.encode(sseLine({ content })));
            } catch { /* skip */ }
          }
        }
        controller.enqueue(encoder.encode(sseLine("[DONE]")));
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

async function streamGroq(apiKey: string, systemPrompt: string, messages: Msg[]): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-10)],
      temperature: 0.3, max_tokens: 1024, stream: true,
    }),
  });
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMIT"); throw new Error(`Groq ${res.status}`); }
  return pipeOpenAICompatibleStream(res);
}

async function streamOpenAI(apiKey: string, systemPrompt: string, messages: Msg[]): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-10)],
      temperature: 0.3, max_tokens: 1024, stream: true,
    }),
  });
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMIT"); throw new Error(`OpenAI ${res.status}`); }
  return pipeOpenAICompatibleStream(res);
}

async function streamGemini(apiKey: string, systemPrompt: string, messages: Msg[]): Promise<ReadableStream<Uint8Array>> {
  const contents = messages.slice(-10).map((m) => ({
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
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) { if (res.status === 429) throw new Error("RATE_LIMIT"); throw new Error(`Gemini ${res.status}`); }
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const words = text.split(" ");
      for (let i = 0; i < words.length; i += 5) {
        const chunk = words.slice(i, i + 5).join(" ") + (i + 5 < words.length ? " " : "");
        controller.enqueue(encoder.encode(sseLine({ content: chunk })));
      }
      controller.enqueue(encoder.encode(sseLine("[DONE]")));
      controller.close();
    },
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
    let stream: ReadableStream<Uint8Array>;
    switch (provider.kind) {
      case "groq":   stream = await streamGroq(provider.key, systemPrompt, messages); break;
      case "openai": stream = await streamOpenAI(provider.key, systemPrompt, messages); break;
      case "gemini": stream = await streamGemini(provider.key, systemPrompt, messages); break;
    }
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
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
