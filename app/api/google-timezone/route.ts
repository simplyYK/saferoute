import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// GET /api/google-timezone?lat=...&lng=...
export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "No API key" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) return NextResponse.json({ error: "lat and lng required" }, { status: 400 });

  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${API_KEY}`
    );
    const data = (await res.json()) as {
      status: string;
      timeZoneId: string;
      timeZoneName: string;
      rawOffset: number;
      dstOffset: number;
    };

    if (data.status !== "OK") {
      return NextResponse.json({ error: data.status }, { status: 400 });
    }

    const totalOffset = data.rawOffset + data.dstOffset;
    const localTime = new Date((timestamp + totalOffset) * 1000).toISOString().replace("Z", "");

    return NextResponse.json({
      timeZoneId: data.timeZoneId,
      timeZoneName: data.timeZoneName,
      rawOffset: data.rawOffset,
      dstOffset: data.dstOffset,
      localTime,
    });
  } catch (err) {
    console.error("[Timezone]", err);
    return NextResponse.json({ error: "Timezone fetch failed" }, { status: 500 });
  }
}
