import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
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

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
}

async function googlePlacesSearch(q: string, lat?: string | null, lng?: string | null) {
  const body: Record<string, unknown> = { textQuery: q, maxResultCount: 8 };
  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: 50000,
      },
    };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Google Places ${res.status}`);
  const data = (await res.json()) as { places?: GooglePlace[] };

  return (data.places ?? []).map((p) => ({
    place_id: p.id,
    description: p.formattedAddress ?? p.displayName?.text ?? "",
    structured_formatting: {
      main_text: p.displayName?.text ?? "",
      secondary_text: p.formattedAddress ?? "",
    },
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    types: p.types,
    source: "google" as const,
  }));
}

async function photonSearch(q: string) {
  const res = await fetch(
    `${PHOTON}?q=${encodeURIComponent(q)}&limit=6&lang=en`,
    { headers: { "User-Agent": "Sentinel/2.0" } }
  );
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };

  return (data.features ?? []).map((f) => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const parts = [p.name, p.city && p.city !== p.name ? p.city : null, p.state, p.country].filter(Boolean);
    return {
      place_id: `${p.osm_type ?? "N"}${p.osm_id ?? Math.random()}`,
      description: parts.join(", "),
      structured_formatting: {
        main_text: p.name ?? p.city ?? "Unknown",
        secondary_text: parts.slice(1).join(", "),
      },
      lat,
      lng,
      source: "osm" as const,
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!q || q.length < 2) return NextResponse.json({ predictions: [] });

  // Try Google first, fall back to Photon
  if (GOOGLE_KEY) {
    try {
      const predictions = await googlePlacesSearch(q, lat, lng);
      if (predictions.length > 0) return NextResponse.json({ predictions });
    } catch (err) {
      console.warn("[Places] Google failed, falling back to Photon:", err);
    }
  }

  try {
    const predictions = await photonSearch(q);
    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
