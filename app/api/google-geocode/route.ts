import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface GeoResult {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  place_id: string;
  types: string[];
}

// GET /api/google-geocode?address=...  OR  ?lat=...&lng=...  (reverse)
export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "No API key" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  let url: string;
  if (address) {
    url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  } else if (lat && lng) {
    url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
  } else {
    return NextResponse.json({ error: "Provide address or lat/lng" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    const data = (await res.json()) as { status: string; results: GeoResult[] };

    if (data.status !== "OK" || !data.results.length) {
      return NextResponse.json({ results: [], status: data.status });
    }

    const results = data.results.slice(0, 5).map((r) => {
      const country = r.address_components.find((c) => c.types.includes("country"));
      const city = r.address_components.find((c) =>
        c.types.includes("locality") || c.types.includes("administrative_area_level_1")
      );
      return {
        formatted_address: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        place_id: r.place_id,
        country: country?.long_name ?? null,
        country_code: country?.short_name ?? null,
        city: city?.long_name ?? null,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[Google Geocode]", err);
    return NextResponse.json({ results: [], error: "Geocoding failed" }, { status: 500 });
  }
}
