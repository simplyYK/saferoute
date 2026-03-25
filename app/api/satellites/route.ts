import { NextResponse } from "next/server";
import type { SatelliteTrack, SatelliteType } from "@/types/intelligence";
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  radiansToDegrees,
} from "satellite.js";

export const dynamic = "force-dynamic";

const CACHE_MS = 10 * 60 * 1000;
const EARTH_KM = 6371;

const URLS: { type: SatelliteType; url: string }[] = [
  {
    type: "starlink",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
  },
  {
    type: "military",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle",
  },
  {
    type: "weather",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
  },
];

let cache: { at: number; data: SatelliteTrack[] } | null = null;

type TleEntry = { name: string; line1: string; line2: string; type: SatelliteType };

function parseTleText(body: string, type: SatelliteType, maxSets: number): TleEntry[] {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: TleEntry[] = [];
  let i = 0;
  while (i < lines.length && out.length < maxSets) {
    const a = lines[i];
    const b = lines[i + 1];
    const c = lines[i + 2];
    if (a.startsWith("1") && b?.startsWith("2")) {
      out.push({ name: "UNKNOWN", line1: a, line2: b, type });
      i += 2;
    } else if (b?.startsWith("1") && c?.startsWith("2")) {
      out.push({ name: a, line1: b, line2: c, type });
      i += 3;
    } else {
      i += 1;
    }
  }
  return out;
}

function noradId(line1: string): string {
  return line1.slice(2, 7).trim();
}

function geodeticAt(
  satrec: ReturnType<typeof twoline2satrec>,
  d: Date
): { lat: number; lng: number; altKm: number } | null {
  const pv = propagate(satrec, d);
  if (!pv || !pv.position) return null;
  const gmst = gstime(d);
  const gd = eciToGeodetic(pv.position, gmst);
  return {
    lat: radiansToDegrees(gd.latitude),
    lng: radiansToDegrees(gd.longitude),
    altKm: gd.height,
  };
}

function buildPath(
  satrec: ReturnType<typeof twoline2satrec>,
  start: Date,
  steps: number,
  stepMin: number
): [number, number, number][] {
  const path: [number, number, number][] = [];
  for (let s = 0; s < steps; s++) {
    const t = new Date(start.getTime() + s * stepMin * 60_000);
    const g = geodeticAt(satrec, t);
    if (!g) continue;
    path.push([g.lat, g.lng, Math.max(0.002, g.altKm / EARTH_KM)]);
  }
  return path;
}

function toTrack(e: TleEntry): SatelliteTrack | null {
  try {
    const satrec = twoline2satrec(e.line1, e.line2);
    const now = new Date();
    const g = geodeticAt(satrec, now);
    if (!g) return null;
    const path = buildPath(satrec, now, 46, 2);
    if (path.length < 2) return null;
    const cleanName = e.name.replace(/\s+/g, " ").trim() || `NORAD ${noradId(e.line1)}`;
    return {
      id: noradId(e.line1),
      name: cleanName,
      lat: g.lat,
      lng: g.lng,
      altitude: g.altKm,
      type: e.type,
      isStarlink: cleanName.toUpperCase().includes("STARLINK"),
      path,
    };
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return "";
  return res.text();
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const [starText, milText, wxText] = await Promise.all([
      fetchText(URLS[0].url),
      fetchText(URLS[1].url),
      fetchText(URLS[2].url),
    ]);

    const military = parseTleText(milText, "military", 80);
    const weather = parseTleText(wxText, "weather", 40);
    const starlink = parseTleText(starText, "starlink", 120);

    const ordered: TleEntry[] = [
      ...military,
      ...weather,
      ...starlink,
    ];

    const seen = new Set<string>();
    const unique: TleEntry[] = [];
    for (const e of ordered) {
      const id = noradId(e.line1);
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(e);
      if (unique.length >= 140) break;
    }

    const tracks: SatelliteTrack[] = [];
    for (const e of unique) {
      const t = toTrack(e);
      if (t) tracks.push(t);
      if (tracks.length >= 100) break;
    }

    cache = { at: Date.now(), data: tracks };
    return NextResponse.json(tracks);
  } catch {
    return NextResponse.json([]);
  }
}
