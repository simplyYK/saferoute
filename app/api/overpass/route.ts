import { NextRequest, NextResponse } from "next/server";

const queryCache = new Map<string, { data: unknown[]; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

const OVERPASS_TAGS: Record<string, string> = {
  hospital: 'node["amenity"="hospital"]',
  clinic: 'node["amenity"="clinic"]',
  pharmacy: 'node["amenity"="pharmacy"]',
  shelter: '(node["amenity"="shelter"];node["building"="bunker"];)',
  police: 'node["amenity"="police"]',
  fire_station: 'node["amenity"="fire_station"]',
  embassy: 'node["amenity"="embassy"]',
  water_point: 'node["amenity"="drinking_water"]',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "hospital";
  const south = searchParams.get("south");
  const west = searchParams.get("west");
  const north = searchParams.get("north");
  const east = searchParams.get("east");

  if (!south || !west || !north || !east) {
    return NextResponse.json({ error: "Missing bbox parameters" }, { status: 400 });
  }

  const bbox = `${south},${west},${north},${east}`;
  const cacheKey = `${type}-${bbox}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ resources: cached.data, cached: true, count: cached.data.length });
  }

  const tag = OVERPASS_TAGS[type] || `node["amenity"="${type}"]`;
  const query = `[out:json][timeout:25];${tag}(${bbox});out body;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = await res.json();

    const resources = (json.elements || []).map((el: {
      id: number;
      lat: number;
      lon: number;
      tags: Record<string, string>;
    }) => {
      const tags = el.tags || {};
      return {
        id: `osm-${el.id}`,
        type: tags.amenity || type,
        name: tags.name || tags["name:en"] || `${type} #${el.id}`,
        latitude: el.lat,
        longitude: el.lon,
        phone: tags.phone || tags["contact:phone"] || null,
        website: tags.website || null,
        address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]].filter(Boolean).join(", ") || null,
        operating_hours: tags.opening_hours || null,
        status: "unknown",
        verified: false,
        source: "osm",
        services: [],
      };
    });

    queryCache.set(cacheKey, { data: resources, timestamp: Date.now() });
    if (queryCache.size > 50) {
      const oldestKey = queryCache.keys().next().value;
      if (oldestKey) queryCache.delete(oldestKey);
    }

    return NextResponse.json({ resources, cached: false, count: resources.length });
  } catch (err) {
    console.error("[Overpass]", err);
    return NextResponse.json({ resources: [], error: "Failed to fetch OSM data", count: 0 }, { status: 500 });
  }
}
