import { NextResponse } from "next/server";
import type { Flight } from "@/types/intelligence";
import { markMilitary } from "@/lib/flight-military";

export const dynamic = "force-dynamic";

const CACHE_MS = 20_000;
let cache: { at: number; data: Flight[] } | null = null;

function adsbLolUrl(lat: number, lng: number): string {
  return `https://api.adsb.lol/v2/lat/${lat.toFixed(1)}/lon/${lng.toFixed(1)}/dist/500`;
}

function feetToMeters(ft: unknown): number | null {
  if (typeof ft !== "number" || !Number.isFinite(ft)) return null;
  return ft * 0.3048;
}

function knotsToMps(kn: unknown): number | null {
  if (typeof kn !== "number" || !Number.isFinite(kn)) return null;
  return kn * 0.514444;
}

function mapAircraft(ac: Record<string, unknown>): Flight | null {
  const hex = ac.hex ?? ac.icao;
  if (typeof hex !== "string") return null;
  const lat = ac.lat;
  const lon = ac.lon ?? ac.lng;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const flightRaw = ac.flight ?? ac.callsign;
  const callsign =
    typeof flightRaw === "string"
      ? flightRaw.trim() || null
      : flightRaw != null
        ? String(flightRaw).trim() || null
        : null;

  const alt = feetToMeters(ac.alt_baro ?? ac.altitude);
  const gs = knotsToMps(ac.gs ?? ac.speed);
  const track = ac.track ?? ac.calc_track ?? ac.heading;
  const heading = typeof track === "number" ? track : null;

  const base: Flight = {
    icao24: hex.toLowerCase(),
    callsign,
    lat,
    lng: typeof lon === "number" ? lon : Number(lon),
    altitude: alt,
    velocity: gs,
    heading,
    onGround: alt != null && alt < 50,
    category: typeof ac.category === "string" ? ac.category : null,
  };

  return markMilitary(base);
}

async function tryFetchJson(url: string): Promise<Flight[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, unknown>;
    const ac = json.ac ?? json.aircraft;
    if (!Array.isArray(ac)) return [];
    const out: Flight[] = [];
    for (const row of ac) {
      if (!row || typeof row !== "object") continue;
      const f = mapAircraft(row as Record<string, unknown>);
      if (f) out.push(f);
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchAll(lat: number, lng: number): Promise<Flight[]> {
  const adsbX = await tryFetchJson(
    `https://adsbexchange.com/api/aircraft/v2/lat/${lat.toFixed(1)}/lon/${lng.toFixed(1)}/dist/500/`
  );
  if (adsbX.length > 0) return adsbX;

  const lol = await tryFetchJson(adsbLolUrl(lat, lng));
  if (lol.length > 0) return lol;

  const fi = await tryFetchJson("https://api.adsb.fi/v1/aircraft");
  return fi;
}

// Cache per region (rounded to 1 decimal)
const regionCache = new Map<string, { at: number; data: Flight[] }>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") ?? "48.5");
    const lng = parseFloat(searchParams.get("lng") ?? "31.5");
    const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;

    const now = Date.now();
    const cached = regionCache.get(key);
    if (cached && now - cached.at < CACHE_MS) {
      return NextResponse.json(cached.data);
    }

    const data = await fetchAll(lat, lng);
    regionCache.set(key, { at: now, data });
    // Prune old cache entries
    if (regionCache.size > 20) {
      const oldest = [...regionCache.entries()].sort((a, b) => a[1].at - b[1].at);
      for (let i = 0; i < oldest.length - 10; i++) regionCache.delete(oldest[i]![0]);
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
