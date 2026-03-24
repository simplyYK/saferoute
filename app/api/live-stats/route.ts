import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function openskyHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const user = process.env.OPENSKY_USERNAME;
  const pass = process.env.OPENSKY_PASSWORD;
  if (user && pass) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  }
  return headers;
}

export async function GET() {
  const dayAgo = Date.now() - 86_400_000;

  try {
    const [statesRes, usgsRes] = await Promise.all([
      fetch("https://opensky-network.org/api/states/all", {
        headers: openskyHeaders(),
        next: { revalidate: 120 },
      }),
      fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson", {
        next: { revalidate: 300 },
      }),
    ]);

    let flightCount = 0;
    if (statesRes.ok) {
      const j = (await statesRes.json()) as { states?: unknown[] };
      flightCount = Array.isArray(j.states) ? j.states.length : 0;
    }

    let seismic24h = 0;
    if (usgsRes.ok) {
      const gj = (await usgsRes.json()) as { features?: Array<{ properties?: { time?: number } }> };
      const feats = gj.features || [];
      seismic24h = feats.filter((f) => (f.properties?.time ?? 0) >= dayAgo).length;
    }

    return NextResponse.json({ flightCount, seismic24h });
  } catch (e) {
    console.error("[live-stats]", e);
    return NextResponse.json({ flightCount: 0, seismic24h: 0 });
  }
}
