import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Voice Agent Webhook — called by ElevenLabs Conversational AI
 *
 * ElevenLabs sends the user's spoken query here. We forward it to our
 * existing /api/groq endpoint (which does OpenAI tool-calling with all
 * 20 Sentinel tools), collect the full streamed response, and return
 * plain text for ElevenLabs to speak back.
 *
 * ElevenLabs tool config:
 *   Name: sentinel_query
 *   Description: "Query Sentinel's crisis intelligence system for live data"
 *   Method: POST
 *   URL: https://YOUR_DOMAIN/api/voice-agent
 *   Body: { "query": "$query", "lat": "$lat", "lng": "$lng", "country": "$country" }
 */

const BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      query?: string;
      lat?: number;
      lng?: number;
      country?: string;
      // ElevenLabs may send the full conversation or just a tool call
      message?: string;
      text?: string;
    };

    const query = body.query || body.message || body.text || "";
    if (!query.trim()) {
      return NextResponse.json({ text: "I didn't catch that. Could you repeat?" });
    }

    // Build context from voice agent params
    const context: Record<string, unknown> = {};
    if (body.lat && body.lng) {
      context.userGPS = { lat: body.lat, lng: body.lng };
      context.locationNote = `User GPS: ${body.lat.toFixed(5)}, ${body.lng.toFixed(5)}`;
    }
    if (body.country) {
      context.country = body.country;
    }

    // Call our existing AI endpoint (does full tool-calling loop)
    const res = await fetch(`${BASE}/api/groq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: query }],
        language: "en",
        context,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        text: "I'm having trouble accessing live data right now. For immediate help, use the Sentinel app directly.",
      });
    }

    // Parse the SSE stream to extract the full text response
    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ text: "No response from intelligence system." });
    }

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as { content?: string; actions?: unknown[] };
          if (parsed.content) fullText += parsed.content;
          // Skip actions — voice can't control the map
        } catch { /* skip malformed lines */ }
      }
    }

    // Clean up the text for speech (remove markdown, links, emojis that don't speak well)
    let speechText = fullText
      .replace(/\*\*/g, "")           // remove bold markers
      .replace(/\*/g, "")             // remove italic markers
      .replace(/#{1,6}\s/g, "")       // remove heading markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
      .replace(/`[^`]+`/g, "")        // remove code
      .replace(/⚠️/g, "Warning: ")
      .replace(/📍|🏥|🛖|💊|🚔|🚒|💧|⛪|🏫|🏛/g, "") // remove resource emojis
      .replace(/\n{3,}/g, "\n\n")     // collapse multiple newlines
      .trim();

    // Truncate for voice — keep it under ~60 seconds of speech (~200 words)
    const words = speechText.split(/\s+/);
    if (words.length > 200) {
      speechText = words.slice(0, 200).join(" ") + ". For more details, check the Sentinel app.";
    }

    return NextResponse.json({ text: speechText });
  } catch (err) {
    console.error("[Voice Agent]", err);
    return NextResponse.json({
      text: "I encountered an error. Please use the text chat in the Sentinel app for now.",
    });
  }
}
