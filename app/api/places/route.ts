import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Photon (Komoot) — free OpenStreetMap autocomplete, no API key required
const PHOTON = "https://photon.komoot.io/api";

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    osm_type?: string;
    osm_id?: number;
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) return NextResponse.json({ predictions: [] });

  try {
    const res = await fetch(
      `${PHOTON}?q=${encodeURIComponent(q)}&limit=6&lang=en`,
      { headers: { "User-Agent": "SafeRoute/1.0" } }
    );
    if (!res.ok) return NextResponse.json({ predictions: [] });

    const data = await res.json() as { features?: PhotonFeature[] };
    const features = data.features ?? [];

    const predictions = features.map((f) => {
      const p = f.properties;
      const [lng, lat] = f.geometry.coordinates;

      // Build a human-readable label
      const parts = [
        p.name,
        p.city && p.city !== p.name ? p.city : null,
        p.state,
        p.country,
      ].filter(Boolean);

      const main = p.name ?? p.city ?? "Unknown";
      const secondary = parts.slice(1).join(", ");
      const place_id = `${p.osm_type ?? "N"}${p.osm_id ?? Math.random()}`;

      return {
        place_id,
        description: parts.join(", "),
        structured_formatting: { main_text: main, secondary_text: secondary },
        // Embed coordinates so no second round-trip is needed
        lat,
        lng,
      };
    });

    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
