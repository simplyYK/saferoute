import { NextRequest } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an intelligence analyst for SafeRoute, a humanitarian crisis navigation platform.
You have access to real-time data: conflict events from ACLED, crowdsourced civilian
reports, live flight tracking (OpenSky + ADSB military), seismic activity (USGS),
and satellite positions (Celestrak).

Your mission: help civilians survive and help coordinators/journalists understand
the situation on the ground. You provide:
- Tactical navigation advice (when asked about routes or movement)
- Threat assessment (interpreting flight patterns, seismic spikes near conflict)
- Medical triage guidance (first aid, stabilization)
- Resource location (shelters, water, hospitals in the area)
- Evacuation planning (corridors, timing, what to bring)

Always prioritize civilian safety. Never speculate beyond available data.
Respond in the user's language. Be concise under stress.`;

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
  if (!context || typeof context !== "object" || Object.keys(context).length === 0) return "";
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
  en: "English",
  uk: "Ukrainian",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  my: "Burmese",
};

function buildSystemPrompt(language: string, context: Record<string, unknown> | undefined): string {
  const langName = langNames[language] || "English";
  return `${SYSTEM_PROMPT}${contextBlock(context)}

User language: ${langName}. Respond in ${langName} unless they write in another language.`;
}

function sseLine(obj: { content?: string } | "[DONE]"): string {
  if (obj === "[DONE]") return "data: [DONE]\n\n";
  return `data: ${JSON.stringify(obj)}\n\n`;
}

async function streamGroqResponse(
  apiKey: string,
  systemPrompt: string,
  messages: Msg[]
): Promise<ReadableStream<Uint8Array>> {
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = groqRes.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode(sseLine("[DONE]")));
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) controller.enqueue(encoder.encode(sseLine({ content })));
            } catch {
              /* skip */
            }
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

async function streamOpenAIResponse(
  apiKey: string,
  systemPrompt: string,
  messages: Msg[]
): Promise<ReadableStream<Uint8Array>> {
  const openai = new OpenAI({ apiKey });
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-10)],
    temperature: 0.3,
    max_tokens: 1024,
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) controller.enqueue(encoder.encode(sseLine({ content })));
        }
        controller.enqueue(encoder.encode(sseLine("[DONE]")));
      } finally {
        controller.close();
      }
    },
  });
}

function geminiContentsFromMessages(messages: Msg[]) {
  const merged: { role: "user" | "model"; text: string }[] = [];
  for (const m of messages.slice(-10)) {
    const role = m.role === "assistant" ? "model" : "user";
    const last = merged[merged.length - 1];
    if (last && last.role === role) last.text += `\n\n${m.content}`;
    else merged.push({ role, text: m.content });
  }
  if (merged[0]?.role !== "user") {
    merged.unshift({ role: "user", text: "Continue our conversation from the prior messages below." });
  }
  return merged.map((x) => ({ role: x.role, parts: [{ text: x.text }] }));
}

async function streamGeminiResponse(
  apiKey: string,
  systemPrompt: string,
  messages: Msg[]
): Promise<ReadableStream<Uint8Array>> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt,
  });

  const contents = geminiContentsFromMessages(messages);

  const result = await model.generateContentStream({ contents });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          try {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(sseLine({ content: text })));
          } catch {
            /* partial chunk */
          }
        }
        controller.enqueue(encoder.encode(sseLine("[DONE]")));
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const provider = getProvider();
  if (!provider) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { messages, language = "en", context } = body as {
    messages: Msg[];
    language?: string;
    context?: Record<string, unknown>;
  };

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildSystemPrompt(language, context);

  try {
    let stream: ReadableStream<Uint8Array>;
    switch (provider.kind) {
      case "groq":
        stream = await streamGroqResponse(provider.key, systemPrompt, messages);
        break;
      case "openai":
        stream = await streamOpenAIResponse(provider.key, systemPrompt, messages);
        break;
      case "gemini":
        stream = await streamGeminiResponse(provider.key, systemPrompt, messages);
        break;
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "AI service is busy. Try again shortly." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("[AI route]", err);
    return new Response(JSON.stringify({ error: "AI service error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
