import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// NASA FIRMS — Fire Information for Resource Management System
// Near-real-time thermal/fire anomaly data from MODIS and VIIRS sensors.
// Free, no API key required for the open RSS/CSV feeds.
// Docs: https://firms.modaps.eosdis.nasa.gov/api/

const FIRMS_CSV =
  "https://firms.modaps.eosdis.nasa.gov/api/area/csv/OPEN_KEY/VIIRS_SNPP_NRT/world/1";
// Fallback: full global day-old summary (always available)
const FIRMS_FALLBACK =
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv";

export interface FirmsHotspot {
  id: string;
  lat: number;
  lng: number;
  brightness: number; // Kelvin — fire radiative temperature
  confidence: string; // "low" | "nominal" | "high"
  frp: number; // Fire Radiative Power in MW
  acq_date: string;
  acq_time: string;
}

const CACHE_MS = 10 * 60 * 1000; // 10 min
let cache: { at: number; data: FirmsHotspot[] } | null = null;

function parseCsv(raw: string): FirmsHotspot[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());

  const iLat = header.indexOf("latitude");
  const iLng = header.indexOf("longitude");
  const iBright = header.indexOf("bright_ti4");
  const iConf = header.indexOf("confidence");
  const iFrp = header.indexOf("frp");
  const iDate = header.indexOf("acq_date");
  const iTime = header.indexOf("acq_time");

  if (iLat < 0 || iLng < 0) return [];

  const out: FirmsHotspot[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    const lat = parseFloat(cols[iLat] ?? "");
    const lng = parseFloat(cols[iLng] ?? "");
    if (isNaN(lat) || isNaN(lng)) continue;

    out.push({
      id: `firms-${i}-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      lat,
      lng,
      brightness: parseFloat(cols[iBright] ?? "0") || 0,
      confidence: cols[iConf]?.trim() ?? "nominal",
      frp: parseFloat(cols[iFrp] ?? "0") || 0,
      acq_date: cols[iDate]?.trim() ?? "",
      acq_time: cols[iTime]?.trim() ?? "",
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // Optional bbox filter
  const south = parseFloat(searchParams.get("south") ?? "NaN");
  const north = parseFloat(searchParams.get("north") ?? "NaN");
  const west = parseFloat(searchParams.get("west") ?? "NaN");
  const east = parseFloat(searchParams.get("east") ?? "NaN");
  const hasBbox = [south, north, west, east].every((n) => !isNaN(n));

  try {
    if (!cache || Date.now() - cache.at > CACHE_MS) {
      let csv = "";
      for (const url of [FIRMS_CSV, FIRMS_FALLBACK]) {
        try {
          const res = await fetch(url, { next: { revalidate: 0 } });
          if (res.ok) {
            csv = await res.text();
            if (csv.includes("latitude")) break;
          }
        } catch {
          continue;
        }
      }
      cache = { at: Date.now(), data: parseCsv(csv) };
    }

    let results = cache.data;
    if (hasBbox) {
      results = results.filter(
        (h) => h.lat >= south && h.lat <= north && h.lng >= west && h.lng <= east
      );
    }

    return NextResponse.json({ hotspots: results, total: results.length });
  } catch {
    return NextResponse.json({ hotspots: [], total: 0 });
  }
}
