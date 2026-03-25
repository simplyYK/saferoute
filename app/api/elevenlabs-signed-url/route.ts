import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

/**
 * POST /api/elevenlabs-signed-url
 * Returns a signed URL for starting an ElevenLabs conversation
 * with the user's current location baked into the agent overrides.
 *
 * Body: { lat?: number, lng?: number, country?: string }
 */
export async function POST(request: NextRequest) {
  if (!API_KEY || !AGENT_ID) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 500 });
  }

  const body = await request.json() as {
    lat?: number;
    lng?: number;
    country?: string;
  };

  try {
    // Get a signed URL with agent overrides that include location context
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
      {
        method: "GET",
        headers: { "xi-api-key": API_KEY },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "Failed to get signed URL", details: err }, { status: res.status });
    }

    const data = await res.json() as { signed_url?: string };

    return NextResponse.json({
      signedUrl: data.signed_url,
      agentId: AGENT_ID,
      context: {
        lat: body.lat ?? 0,
        lng: body.lng ?? 0,
        country: body.country ?? "Unknown",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
