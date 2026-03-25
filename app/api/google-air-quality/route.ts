import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// GET /api/google-air-quality?lat=...&lng=...
export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "No API key" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) return NextResponse.json({ error: "lat and lng required" }, { status: 400 });

  const cacheKey = `${parseFloat(lat).toFixed(2)},${parseFloat(lng).toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          extraComputations: ["HEALTH_RECOMMENDATIONS", "DOMINANT_POLLUTANT_CONCENTRATION"],
          languageCode: "en",
        }),
      }
    );

    if (!res.ok) {
      console.error("[Air Quality]", res.status, await res.text());
      return NextResponse.json({ error: "Air quality fetch failed" }, { status: 500 });
    }

    const data = (await res.json()) as {
      dateTime?: string;
      indexes?: Array<{
        code: string;
        displayName: string;
        aqi: number;
        aqiDisplay: string;
        color?: { red?: number; green?: number; blue?: number };
        category: string;
        dominantPollutant: string;
      }>;
      healthRecommendations?: Record<string, string>;
    };

    const uaqi = data.indexes?.find((i) => i.code === "uaqi");
    const usaqi = data.indexes?.find((i) => i.code === "usa_epa");

    const result = {
      dateTime: data.dateTime,
      aqi: usaqi?.aqi ?? uaqi?.aqi ?? null,
      category: usaqi?.category ?? uaqi?.category ?? "Unknown",
      dominantPollutant: usaqi?.dominantPollutant ?? uaqi?.dominantPollutant ?? null,
      healthRecommendations: data.healthRecommendations ?? {},
      indexes: data.indexes ?? [],
    };

    cache.set(cacheKey, { data: result, ts: Date.now() });
    if (cache.size > 100) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Air Quality]", err);
    return NextResponse.json({ error: "Air quality fetch failed" }, { status: 500 });
  }
}
