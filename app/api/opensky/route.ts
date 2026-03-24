import { NextResponse } from "next/server";
import type { Flight } from "@/types/intelligence";
import { getClientIp } from "@/lib/api-client-ip";
import { openskyCanRequest, openskyMarkRequested } from "@/lib/opensky-rate-limit";

export const dynamic = "force-dynamic";

const CACHE_MS = 15_000;
let cache: { at: number; data: Flight[] } | null = null;

function mapState(row: (string | number | boolean | null)[]): Flight | null {
  if (!Array.isArray(row) || row.length < 11) return null;
  const lon = row[5];
  const lat = row[6];
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const icao24 = String(row[0] ?? "").trim();
  const rawCs = row[1];
  const callsign =
    typeof rawCs === "string" ? rawCs.trim() || null : rawCs != null ? String(rawCs).trim() || null : null;

  const baro = row[7];
  const onGround = row[8] === true;
  const vel = row[9];
  const track = row[10];

  return {
    icao24,
    callsign,
    lat,
    lng: lon,
    altitude: typeof baro === "number" ? baro : null,
    velocity: typeof vel === "number" ? vel : null,
    heading: typeof track === "number" ? track : null,
    onGround,
    category: null,
    isMilitary: false,
  };
}

async function fetchOpensky(): Promise<Flight[]> {
  const url = "https://opensky-network.org/api/states/all";
  const user = process.env.OPENSKY_USERNAME;
  const pass = process.env.OPENSKY_PASSWORD;
  const headers: HeadersInit = { Accept: "application/json" };
  if (user && pass) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  }
  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    states?: (string | number | boolean | null)[][] | null;
  };
  const states = json.states;
  if (!Array.isArray(states)) return [];

  const out: Flight[] = [];
  for (const s of states) {
    const f = mapState(s);
    if (f) out.push(f);
  }
  return out;
}

export async function GET() {
  try {
    const ip = await getClientIp();
    const now = Date.now();

    if (cache && now - cache.at < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    if (!openskyCanRequest(ip)) {
      if (cache) return NextResponse.json(cache.data);
      return NextResponse.json([]);
    }

    openskyMarkRequested(ip);
    const data = await fetchOpensky();
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
