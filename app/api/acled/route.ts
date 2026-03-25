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

let cache: { data: unknown[]; timestamp: number; country: string } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000;

// OAuth token cache
let tokenCache: { access_token: string; expires_at: number; refresh_token: string } | null = null;

async function getACLEDToken(): Promise<string | null> {
  const username = process.env.ACLED_USERNAME;
  const password = process.env.ACLED_PASSWORD;
  if (!username || !password) return null;

  // Check if cached token is still valid (with 5min buffer)
  if (tokenCache && Date.now() < tokenCache.expires_at - 300000) {
    return tokenCache.access_token;
  }

  // Try refresh token first
  if (tokenCache?.refresh_token) {
    try {
      const res = await fetch("https://acleddata.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: tokenCache.refresh_token,
          grant_type: "refresh_token",
          client_id: "acled",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        tokenCache = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + data.expires_in * 1000,
        };
        return data.access_token;
      }
    } catch { /* fall through to password grant */ }
  }

  // Get new token with password grant
  try {
    const res = await fetch("https://acleddata.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username,
        password,
        grant_type: "password",
        client_id: "acled",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    tokenCache = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

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

function getSeedData(country: string) {
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let country = searchParams.get("country") || "Ukraine";

  // "My Location" is not a valid ACLED country — return empty instead of erroring
  if (country === "My Location") {
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
      cached: false,
      count: 0,
      source: "none",
      note: "Select a specific country/region to see conflict data",
    });
  }

  if (cache && cache.country === country && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ type: "FeatureCollection", features: cache.data, cached: true, count: cache.data.length });
  }

  // Try OAuth token auth first
  const token = await getACLEDToken();

  if (!token) {
    // Also try legacy API key as fallback
    const apiKey = process.env.ACLED_API_KEY;
    if (!apiKey) {
      return getSeedData(country);
    }

    // Legacy API key path
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
      cache = { data: features, timestamp: Date.now(), country };
      return NextResponse.json({ type: "FeatureCollection", features, cached: false, count: features.length });
    } catch (err) {
      console.error("[ACLED]", err);
      return getSeedData(country);
    }
  }

  // OAuth token path
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const url = new URL("https://acleddata.com/api/acled/read");
    url.searchParams.set("country", country);
    url.searchParams.set("event_date", `${startDate}|${endDate}`);
    url.searchParams.set("event_date_where", "BETWEEN");
    url.searchParams.set("limit", "500");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`ACLED OAuth ${res.status}`);

    // Guard against HTML error pages — check content-type before parsing
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`ACLED returned non-JSON (${contentType})`);
    }

    const json = await res.json();
    if (json.message || json.error) {
      throw new Error(`ACLED API error: ${json.message || json.error}`);
    }
    const events = json.data || json;
    const features = toGeoJSON(Array.isArray(events) ? events : []);
    cache = { data: features, timestamp: Date.now(), country };
    return NextResponse.json({ type: "FeatureCollection", features, cached: false, count: features.length, source: "acled" });
  } catch (err) {
    console.error("[ACLED OAuth]", err);
    if (cache && cache.country === country) {
      return NextResponse.json({ type: "FeatureCollection", features: cache.data, cached: true, stale: true, count: cache.data.length });
    }
    return getSeedData(country);
  }
}
