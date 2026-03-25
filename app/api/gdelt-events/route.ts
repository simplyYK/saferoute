import { NextRequest, NextResponse } from "next/server";
import { fipsToName } from "@/lib/constants/country-codes";

export const dynamic = "force-dynamic";

/**
 * Fetches real-time geolocated conflict events from GDELT V2.
 * GDELT publishes event data every 15 minutes as free CSV files.
 * We parse the latest windows and filter for conflict events in the requested country.
 *
 * CAMEO Root Codes for conflict:
 *  14 = Protest
 *  17 = Coerce
 *  18 = Assault
 *  19 = Fight (use of conventional force)
 *  20 = Mass violence (bombing, etc.)
 */

const CONFLICT_ROOT_CODES = new Set(["14", "17", "18", "19", "20"]);

// CAMEO event descriptions
const EVENT_TYPES: Record<string, string> = {
  "140": "Protest", "141": "Demonstrate peacefully", "142": "Hunger strike",
  "143": "Conduct strike", "144": "Obstruct passage", "145": "Protest violently",
  "170": "Coerce", "171": "Seize/confiscate", "172": "Impose blockade",
  "173": "Ban/restrict movement", "174": "Expel/deport",
  "175": "Use force against personnel", "176": "Detain/arrest",
  "180": "Assault", "181": "Abduct/kidnap", "182": "Sexually assault",
  "183": "Torture", "184": "Kill by physical assault", "185": "Assassinate",
  "186": "Injure with small arms",
  "190": "Fight", "191": "Use conventional force", "192": "Fight with small arms",
  "193": "Fight with artillery/tanks", "194": "Occupy territory",
  "195": "Fight with air strikes",
  "200": "Mass violence", "201": "Mass violence — unspecified means",
  "202": "Mass killing", "203": "Use indiscriminate violence",
};

interface GdeltEvent {
  id: string;
  date: string;
  actor1: string;
  actor2: string;
  event_type: string;
  event_code: string;
  goldstein: number;
  num_mentions: number;
  lat: number;
  lng: number;
  country: string;
  location: string;
  source_url: string;
  severity: "critical" | "high" | "medium" | "low";
}

function classifySeverity(goldstein: number, rootCode: string, mentions: number): "critical" | "high" | "medium" | "low" {
  if (rootCode === "20" || goldstein <= -9) return "critical";
  if (rootCode === "19" || rootCode === "18" || goldstein <= -7) return "high";
  if (rootCode === "17" || goldstein <= -4) return "medium";
  return "low";
}

// Cache: { events, timestamp }
let cache: { events: GdeltEvent[]; ts: number; windows: string[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function fetchGdeltWindow(timestamp: string): Promise<GdeltEvent[]> {
  const url = `http://data.gdeltproject.org/gdeltv2/${timestamp}.export.CSV.zip`;
  const res = await fetch(url);
  if (!res.ok) return [];

  // Unzip in memory
  const buffer = await res.arrayBuffer();

  // Use a simple approach: the ZIP file contains one CSV file
  // ZIP local file header is 30 bytes + filename, then the raw CSV data
  const bytes = new Uint8Array(buffer);

  // Find the start of CSV data after ZIP header
  // Local file header signature = 0x04034b50
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return [];

  const fnameLen = bytes[26] | (bytes[27] << 8);
  const extraLen = bytes[28] | (bytes[29] << 8);
  const compressionMethod = bytes[8] | (bytes[9] << 8);

  if (compressionMethod !== 0) {
    // Compressed - need DecompressionStream
    const compressedStart = 30 + fnameLen + extraLen;
    const compressedSize = (bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24));
    const compressedData = bytes.slice(compressedStart, compressedStart + compressedSize);

    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();

      writer.write(compressedData);
      writer.close();

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const csvText = new TextDecoder().decode(concatUint8Arrays(chunks));
      return parseCsv(csvText);
    } catch {
      return [];
    }
  }

  // Uncompressed
  const dataStart = 30 + fnameLen + extraLen;
  const csvText = new TextDecoder().decode(bytes.slice(dataStart));
  return parseCsv(csvText);
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function parseCsv(csvText: string): GdeltEvent[] {
  const events: GdeltEvent[] = [];
  const lines = csvText.split("\n");

  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 61) continue;

    const rootCode = cols[28];
    if (!CONFLICT_ROOT_CODES.has(rootCode)) continue;

    const countryCode = cols[53] || cols[45];
    const countryName = fipsToName(countryCode);
    if (!countryName) continue; // Skip events with unknown FIPS codes

    const lat = parseFloat(cols[56] || cols[48]);
    const lng = parseFloat(cols[57] || cols[49]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue; // Skip null island

    const goldstein = parseFloat(cols[30]) || 0;
    const mentions = parseInt(cols[31]) || 0;
    const eventCode = cols[26];

    events.push({
      id: cols[0],
      date: cols[1],
      actor1: cols[6] || "",
      actor2: cols[16] || "",
      event_type: EVENT_TYPES[eventCode] || EVENT_TYPES[eventCode.slice(0, 2) + "0"] || `CAMEO ${eventCode}`,
      event_code: eventCode,
      goldstein,
      num_mentions: mentions,
      lat,
      lng,
      country: countryName,
      location: cols[52] || cols[44] || "",
      source_url: cols[60] || "",
      severity: classifySeverity(goldstein, rootCode, mentions),
    });
  }

  return events;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || "";

  // Return from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    const filtered = country
      ? cache.events.filter((e) => e.country === country)
      : cache.events;

    return NextResponse.json({
      type: "FeatureCollection",
      features: toGeoJSON(filtered),
      count: filtered.length,
      cached: true,
      source: "GDELT V2 (15-min updates)",
      windows: cache.windows,
    });
  }

  // Fetch the last 3 hours (12 windows of 15 min each)
  const now = new Date();
  // Round down to nearest 15 minutes
  now.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);

  const windows: string[] = [];
  for (let i = 0; i < 12; i++) {
    const ts = new Date(now.getTime() - i * 15 * 60 * 1000);
    windows.push(
      `${ts.getUTCFullYear()}${String(ts.getUTCMonth() + 1).padStart(2, "0")}${String(ts.getUTCDate()).padStart(2, "0")}${String(ts.getUTCHours()).padStart(2, "0")}${String(ts.getUTCMinutes()).padStart(2, "0")}00`
    );
  }

  // Fetch in parallel (up to 6 at a time)
  const allEvents: GdeltEvent[] = [];
  const seenIds = new Set<string>();
  const fetchedWindows: string[] = [];

  for (let batch = 0; batch < windows.length; batch += 6) {
    const batchWindows = windows.slice(batch, batch + 6);
    const results = await Promise.allSettled(
      batchWindows.map((w) => fetchGdeltWindow(w))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled") {
        fetchedWindows.push(batchWindows[j]);
        for (const e of r.value) {
          if (!seenIds.has(e.id)) {
            seenIds.add(e.id);
            allEvents.push(e);
          }
        }
      }
    }
  }

  // Update cache with ALL events (not filtered)
  cache = { events: allEvents, ts: Date.now(), windows: fetchedWindows };

  const filtered = country
    ? allEvents.filter((e) => e.country === country)
    : allEvents;

  return NextResponse.json({
    type: "FeatureCollection",
    features: toGeoJSON(filtered),
    count: filtered.length,
    total: allEvents.length,
    cached: false,
    source: "GDELT V2 (15-min updates)",
    windows: fetchedWindows,
  });
}

function toGeoJSON(events: GdeltEvent[]) {
  return events.map((e) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [e.lng, e.lat],
    },
    properties: {
      id: e.id,
      event_date: `${e.date.slice(0, 4)}-${e.date.slice(4, 6)}-${e.date.slice(6, 8)}`,
      event_type: e.event_type,
      sub_event_type: `CAMEO ${e.event_code}`,
      actor1: e.actor1,
      actor2: e.actor2,
      location: e.location,
      admin1: "",
      fatalities: 0, // GDELT doesn't report fatalities directly
      notes: `Goldstein scale: ${e.goldstein} (${e.goldstein <= -7 ? "highly conflictual" : e.goldstein <= -4 ? "conflictual" : "mildly conflictual"}). ${e.num_mentions} news mentions.`,
      source: e.source_url ? `GDELT — ${new URL(e.source_url).hostname}` : "GDELT",
      source_url: e.source_url,
      severity: e.severity,
    },
  }));
}
