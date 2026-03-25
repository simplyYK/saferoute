import { NextResponse } from "next/server";
import type { SeismicEvent } from "@/types/intelligence";
import { isInConflictZone } from "@/lib/seismic-zones";

export const dynamic = "force-dynamic";

const USGS = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; data: SeismicEvent[] } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < CACHE_MS) {
      return NextResponse.json({ events: cache.data });
    }

    const res = await fetch(USGS, { next: { revalidate: 0 } });
    if (!res.ok) {
      return NextResponse.json([]);
    }

    const geo = (await res.json()) as {
      features?: {
        id?: string;
        geometry?: { coordinates?: number[] };
        properties?: Record<string, unknown>;
      }[];
    };

    const feats = Array.isArray(geo.features) ? geo.features : [];
    const out: SeismicEvent[] = [];

    for (const f of feats) {
      const coords = f.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 3) continue;
      const [lng, lat, depth] = coords;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      const props = f.properties ?? {};
      const mag = props.mag;
      if (typeof mag !== "number" || mag < 1.0) continue;

      const timeMs = props.time;
      const time =
        typeof timeMs === "number"
          ? new Date(timeMs).toISOString()
          : typeof props.updated === "number"
            ? new Date(props.updated).toISOString()
            : new Date().toISOString();

      const sig = props.sig;
      out.push({
        id: String(f.id ?? props.code ?? `${lat},${lng},${time}`),
        lat,
        lng,
        magnitude: mag,
        depth: typeof depth === "number" ? depth : null,
        place: typeof props.place === "string" ? props.place : "Unknown",
        time,
        significance: typeof sig === "number" ? sig : null,
        inConflictZone: isInConflictZone(lat, lng),
      });
    }

    cache = { at: Date.now(), data: out };
    return NextResponse.json({ events: out });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
