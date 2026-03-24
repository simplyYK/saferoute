import { NextRequest, NextResponse } from "next/server";

const countryCache = new Map<string, { data: unknown[]; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || "UA";
  const page = parseInt(searchParams.get("page") || "1");
  const cacheKey = `${country}-${page}`;

  const cached = countryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ facilities: cached.data, cached: true, count: cached.data.length });
  }

  const apiKey = process.env.HEALTHSITES_API_KEY;
  const url = new URL("https://healthsites.io/api/v2/facilities/");
  url.searchParams.set("country", country);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("format", "json");
  if (apiKey) url.searchParams.set("api-key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Healthsites ${res.status}`);
    const json = await res.json();
    const raw = Array.isArray(json) ? json : json.results || [];

    const facilities = raw.map((f: {
      uuid?: string;
      id?: number;
      name?: string;
      centroid?: { coordinates: [number, number] };
      attributes?: Record<string, string | undefined>;
    }) => {
      const attrs = f.attributes || {};
      return {
        id: `hs-${f.uuid || f.id}`,
        name: attrs.name || f.name || "Unnamed Facility",
        type: attrs.amenity || attrs.healthcare || "health_facility",
        latitude: f.centroid?.coordinates[1] || 0,
        longitude: f.centroid?.coordinates[0] || 0,
        phone: attrs.phone || null,
        operator: attrs.operator || null,
        beds: attrs.beds ? parseInt(attrs.beds) : null,
        hasEmergency: attrs.emergency === "yes",
        openingHours: attrs.opening_hours || null,
        source: "healthsites.io",
        status: "unknown",
        verified: true,
        services: [],
      };
    });

    countryCache.set(cacheKey, { data: facilities, timestamp: Date.now() });
    return NextResponse.json({ facilities, cached: false, count: facilities.length });
  } catch (err) {
    console.error("[Healthsites]", err);
    return NextResponse.json({ facilities: [], error: "Failed to fetch facilities", count: 0 }, { status: 500 });
  }
}
