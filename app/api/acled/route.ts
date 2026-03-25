import { NextRequest, NextResponse } from "next/server";
import { SEED_CONFLICT_DATA } from "@/lib/constants/seed-conflict-data";

interface ACLEDEvent {
  event_id_cnty: string;
  event_date: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  country: string;
  admin1: string;
  admin2: string;
  location: string;
  latitude: string;
  longitude: string;
  fatalities: string;
  notes: string;
  source: string;
  timestamp: string;
}

let cache: { data: unknown[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000;

function classifySeverity(event: ACLEDEvent): "critical" | "high" | "medium" | "low" {
  const fatalities = parseInt(event.fatalities) || 0;
  const type = event.event_type.toLowerCase();
  if (fatalities > 10 || type.includes("explosion") || type.includes("remote violence"))
    return "critical";
  if (fatalities > 0 || type.includes("battle") || type.includes("violence against civilians"))
    return "high";
  if (type.includes("strategic") || type.includes("protest")) return "low";
  return "medium";
}

function toGeoJSON(events: ACLEDEvent[]) {
  return events
    .filter((e) => e.latitude && e.longitude)
    .map((e) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [parseFloat(e.longitude), parseFloat(e.latitude)],
      },
      properties: {
        id: e.event_id_cnty,
        event_date: e.event_date,
        event_type: e.event_type,
        sub_event_type: e.sub_event_type,
        actor1: e.actor1,
        actor2: e.actor2 || "",
        location: e.location,
        admin1: e.admin1,
        fatalities: parseInt(e.fatalities) || 0,
        notes: e.notes,
        source: e.source,
        severity: classifySeverity(e),
      },
    }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || "Ukraine";

  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ type: "FeatureCollection", features: cache.data, cached: true, count: cache.data.length });
  }

  const apiKey = process.env.ACLED_API_KEY;
  if (!apiKey) {
    const seedEvents = SEED_CONFLICT_DATA[country] || [];
    const features = seedEvents.map((e, i) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
      properties: {
        id: `seed-${country}-${i}`,
        event_date: e.event_date,
        event_type: e.event_type,
        sub_event_type: e.sub_event_type,
        actor1: e.source,
        actor2: "",
        location: e.location,
        admin1: e.admin1,
        fatalities: e.fatalities,
        notes: e.notes,
        source: e.source,
        severity: e.severity,
      },
    }));
    return NextResponse.json({ type: "FeatureCollection", features, cached: false, count: features.length, source: "seed" });
  }

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const url = new URL("https://api.acleddata.com/acled/read");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("email", process.env.ACLED_EMAIL || "");
    url.searchParams.set("country", country);
    url.searchParams.set("event_date", `${startDate}|${endDate}`);
    url.searchParams.set("event_date_where", "BETWEEN");
    url.searchParams.set("limit", "500");
    url.searchParams.set("fields", "event_id_cnty|event_date|event_type|sub_event_type|actor1|actor2|country|admin1|admin2|location|latitude|longitude|fatalities|notes|source|timestamp");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`ACLED ${res.status}`);
    const json = await res.json();
    const features = toGeoJSON(json.data || []);
    cache = { data: features, timestamp: Date.now() };
    return NextResponse.json({ type: "FeatureCollection", features, cached: false, count: features.length });
  } catch (err) {
    console.error("[ACLED]", err);
    if (cache) {
      return NextResponse.json({ type: "FeatureCollection", features: cache.data, cached: true, stale: true, count: cache.data.length });
    }
    return NextResponse.json({ type: "FeatureCollection", features: [], error: "Failed to fetch conflict data", count: 0 }, { status: 500 });
  }
}
