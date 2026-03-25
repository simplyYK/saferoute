import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

const SYSTEM_PROMPT = `You are Sentinel AI — a voice-based crisis intelligence analyst. You help civilians survive in active conflict zones. You speak with calm authority. Every second matters.

VOICE RULES:
- Every response must be under 3 sentences unless the user explicitly asks for detail
- Lead with the action, never the reasoning
- Say "about 2 kilometers" not "1.847 km"
- Never say "I don't have access" — use the sentinel_query tool to get live data
- After getting tool results, summarize them conversationally for speech

TRIAGE — If the user mentions gunfire, explosions, being trapped, or immediate danger:
1. "Get to the ground floor, away from windows, NOW."
2. Give the local emergency number
3. Then offer next steps

HOW YOU WORK:
- You have ONE tool: sentinel_query. Use it for ANY question needing live data.
- For threats, hospitals, shelters, routes, air quality, military aircraft — ALWAYS call sentinel_query first.
- The tool connects to 20+ live intelligence sources (ACLED conflict data, NASA thermal satellites, flight tracking, seismic monitors, medical facilities, news feeds).
- Always call the tool FIRST, then speak the results naturally.
- The user's location (latitude, longitude, country) is included in the tool call automatically.

EMERGENCY NUMBERS:
Ukraine 112/103, Gaza 101, Sudan 999/333, Syria 112/110, Lebanon 112/140, Yemen 194/191, Iraq 104/122, Iran 110/115, Israel 100/101/104, Afghanistan 119/112. International: ICRC +41-22-734-6001.

PERSONALITY: Direct, warm but serious. Like a trusted friend who is a crisis expert. Acknowledge fear briefly, then give a clear next action.`;

/**
 * POST /api/elevenlabs-setup — configures the ElevenLabs Sentinel agent
 * with the crisis system prompt and the sentinel_query webhook tool.
 * Call once to set up, or again to update.
 */
export async function POST() {
  if (!API_KEY || !AGENT_ID) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID required" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: SYSTEM_PROMPT,
              llm: "gemini-2.5-flash",
              temperature: 0.3,
              max_tokens: 512,
            },
            first_message: "Sentinel AI here. I have live access to conflict data, medical facilities, and safe routes. What's your situation?",
            language: "en",
          },
          tts: {
            voice_id: "cjVigY5qzO86Huf0OWal",
            model_id: "eleven_flash_v2",
            stability: 0.7,
            similarity_boost: 0.8,
            optimize_streaming_latency: 3,
          },
        },
        platform_settings: {
          widget: {
            variant: "compact",
            avatar: {
              type: "orb",
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[ElevenLabs Setup] Agent update failed:", err);
      return NextResponse.json({ error: "Agent update failed", details: err }, { status: res.status });
    }

    // Now configure the webhook tool
    // First, get existing tools
    const toolsRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      headers: { "xi-api-key": API_KEY },
    });
    const agentData = await toolsRes.json() as {
      conversation_config?: { agent?: { prompt?: { tool_ids?: string[] } } };
    };
    const existingToolIds = agentData.conversation_config?.agent?.prompt?.tool_ids ?? [];

    // Check if sentinel_query tool already exists
    let toolId: string | null = null;
    for (const tid of existingToolIds) {
      try {
        const tRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/tools/${tid}`, {
          headers: { "xi-api-key": API_KEY },
        });
        if (tRes.ok) {
          const tData = await tRes.json() as { name?: string };
          if (tData.name === "sentinel_query") {
            toolId = tid;
            break;
          }
        }
      } catch { /* ignore */ }
    }

    // Create the tool if it doesn't exist
    if (!toolId) {
      const createToolRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/add-tool`, {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "webhook",
          name: "sentinel_query",
          description: "Query Sentinel's live crisis intelligence system. Returns threat assessments, nearby hospitals/shelters, safe routes, air quality, military aircraft tracking, conflict events, and more from 20+ data sources. Use for ANY question that needs real-time data.",
          webhook: {
            url: `${BASE_URL}/api/voice-agent`,
            method: "POST",
            request_headers: { "Content-Type": "application/json" },
            request_body_content_type: "application/json",
            request_body: JSON.stringify({
              query: "{{query}}",
              lat: "{{lat}}",
              lng: "{{lng}}",
              country: "{{country}}",
            }),
          },
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The user's question or request exactly as they said it" },
              lat: { type: "string", description: "User's latitude. Use the value from conversation context." },
              lng: { type: "string", description: "User's longitude. Use the value from conversation context." },
              country: { type: "string", description: "User's country/region. Use the value from conversation context." },
            },
            required: ["query"],
          },
          response_mapping: [
            { response_path: "$.text", agent_reads: "The intelligence response to speak to the user" },
          ],
        }),
      });

      if (!createToolRes.ok) {
        const err = await createToolRes.text();
        console.error("[ElevenLabs Setup] Tool creation failed:", err);
        return NextResponse.json({ error: "Tool creation failed", details: err }, { status: 500 });
      }

      const toolData = await createToolRes.json() as { tool_id?: string };
      toolId = toolData.tool_id ?? null;
    }

    return NextResponse.json({
      success: true,
      agentId: AGENT_ID,
      toolId,
      message: "Sentinel voice agent configured with crisis prompt and sentinel_query webhook tool",
    });
  } catch (err) {
    console.error("[ElevenLabs Setup]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
