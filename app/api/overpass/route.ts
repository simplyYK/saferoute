import { NextRequest, NextResponse } from "next/server";
import type { Resource, ResourceType } from "@/types/resource";

const queryCache = new Map<string, { data: Resource[]; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function mapAmenity(amenity: string | undefined): ResourceType {
  switch (amenity) {
    case "hospital":
      return "hospital";
    case "shelter":
      return "shelter";
    case "pharmacy":
      return "pharmacy";
    case "water_point":
    case "drinking_water":
      return "water_point";
    case "police":
      return "police_station";
    case "fire_station":
      return "fire_station";
    default:
      return "hospital";
  }
}

function buildAroundQuery(lat: number, lng: number): string {
  return `[out:json][timeout:15];
(
  node["amenity"="hospital"](around:5000,${lat},${lng});
  node["amenity"="shelter"](around:5000,${lat},${lng});
  node["amenity"="pharmacy"](around:5000,${lat},${lng});
  node["amenity"="water_point"](around:5000,${lat},${lng});
  node["amenity"="drinking_water"](around:5000,${lat},${lng});
  node["amenity"="police"](around:5000,${lat},${lng});
  node["amenity"="fire_station"](around:5000,${lat},${lng});
);
out body;`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: "Missing lat and lng", resources: [] }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid lat or lng", resources: [] }, { status: 400 });
  }

  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ resources: cached.data, cached: true, count: cached.data.length });
  }

  const query = buildAroundQuery(lat, lng);

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = await res.json();

    const now = new Date().toISOString();
    const resources: Resource[] = (json.elements || []).map(
      (el: {
        id: number;
        lat: number;
        lon: number;
        tags?: Record<string, string>;
      }) => {
        const tags = el.tags || {};
        const amenity = tags.amenity || "hospital";
        const type = mapAmenity(amenity);
        return {
          id: `osm-${el.id}`,
          type,
          name: tags.name || tags["name:en"] || `${amenity} #${el.id}`,
          description: null,
          latitude: el.lat,
          longitude: el.lon,
          phone: tags.phone || tags["contact:phone"] || null,
          website: tags.website || null,
          address:
            [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]].filter(Boolean).join(", ") ||
            null,
          operating_hours: tags.opening_hours || null,
          status: "unknown" as const,
          verified: false,
          source: "osm",
          services: [],
          capacity: null,
          current_occupancy: null,
          created_at: now,
          updated_at: now,
          tags,
        };
      }
    );

    queryCache.set(cacheKey, { data: resources, timestamp: Date.now() });
    if (queryCache.size > 40) {
      const first = queryCache.keys().next().value;
      if (first) queryCache.delete(first);
    }

    return NextResponse.json({ resources, cached: false, count: resources.length });
  } catch (err) {
    console.error("[Overpass]", err);
    return NextResponse.json({ resources: [], error: "Failed to fetch OSM data", count: 0 }, { status: 500 });
  }
}
