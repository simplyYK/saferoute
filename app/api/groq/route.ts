import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are SafeRoute AI, an emergency crisis assistant for civilians in active conflict zones.

RULES:
1. Provide LIFE-SAVING information: first aid, evacuation guidance, legal rights, shelter instructions.
2. Respond in the SAME LANGUAGE the user writes in.
3. Be CONCISE — use bullet points and numbered steps.
4. NEVER provide military information, weapon instructions, or anything to harm others.
5. Always recommend contacting ICRC (icrc.org), UNHCR, or local emergency services.
6. For medical questions: provide first aid but always say "seek professional medical help immediately."
7. For legal questions: provide general IHL guidance, advise consulting a professional.
8. If you don't know something, say so. Never fabricate emergency information.
9. Start urgent responses with "IMMEDIATE ACTION:" followed by what to do RIGHT NOW.
10. You are empathetic but direct. Lives depend on clarity.`;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 15) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { messages, language = "en" } = body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    language?: string;
  };

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
  const systemPrompt = `${SYSTEM_PROMPT}\n\nUser language: ${langName}. Respond in ${langName} unless they write in another language.`;

  try {
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
      if (groqRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Try again shortly." }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Groq ${groqRes.status}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqRes.body?.getReader();
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
                const parsed = JSON.parse(data);
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

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    console.error("[Groq]", err);
    return new Response(JSON.stringify({ error: "AI service error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
