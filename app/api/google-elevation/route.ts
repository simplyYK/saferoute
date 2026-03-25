import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// GET /api/google-elevation?locations=lat,lng|lat,lng|...
// OR POST with { path: [[lat,lng], ...], samples: 50 }
export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "No API key" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const locations = searchParams.get("locations");

  if (!locations) {
    return NextResponse.json({ error: "Provide locations as lat,lng|lat,lng" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locations)}&key=${API_KEY}`
    );
    const data = (await res.json()) as {
      status: string;
      results: Array<{ elevation: number; location: { lat: number; lng: number }; resolution: number }>;
    };

    if (data.status !== "OK") {
      return NextResponse.json({ elevations: [], status: data.status });
    }

    return NextResponse.json({
      elevations: data.results.map((r) => ({
        elevation: Math.round(r.elevation * 10) / 10,
        lat: r.location.lat,
        lng: r.location.lng,
      })),
    });
  } catch (err) {
    console.error("[Elevation]", err);
    return NextResponse.json({ elevations: [], error: "Elevation fetch failed" }, { status: 500 });
  }
}

// POST for path-based elevation (for route profiles)
export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "No API key" }, { status: 503 });

  const body = (await req.json()) as { path: [number, number][]; samples?: number };
  const samples = Math.min(body.samples ?? 50, 512);

  const pathStr = body.path.map(([lat, lng]) => `${lat},${lng}`).join("|");

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?path=${encodeURIComponent(pathStr)}&samples=${samples}&key=${API_KEY}`
    );
    const data = (await res.json()) as {
      status: string;
      results: Array<{ elevation: number; location: { lat: number; lng: number } }>;
    };

    if (data.status !== "OK") {
      return NextResponse.json({ elevations: [], status: data.status });
    }

    const elevations = data.results.map((r) => ({
      elevation: Math.round(r.elevation * 10) / 10,
      lat: r.location.lat,
      lng: r.location.lng,
    }));

    const elevationValues = elevations.map((e) => e.elevation);
    const stats = {
      min: Math.min(...elevationValues),
      max: Math.max(...elevationValues),
      gain: 0,
      loss: 0,
    };
    for (let i = 1; i < elevationValues.length; i++) {
      const diff = elevationValues[i] - elevationValues[i - 1];
      if (diff > 0) stats.gain += diff;
      else stats.loss += Math.abs(diff);
    }
    stats.gain = Math.round(stats.gain);
    stats.loss = Math.round(stats.loss);

    return NextResponse.json({ elevations, stats });
  } catch (err) {
    console.error("[Elevation Path]", err);
    return NextResponse.json({ elevations: [], error: "Elevation fetch failed" }, { status: 500 });
  }
}
