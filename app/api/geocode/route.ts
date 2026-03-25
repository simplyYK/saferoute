import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Reverse geocode lat/lng → country using Nominatim (free, no key)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&zoom=3&accept-language=en`,
      { headers: { "User-Agent": "SafeRoute/1.0" } }
    );
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = (await res.json()) as {
      address?: { country?: string; country_code?: string };
    };

    return NextResponse.json({
      country: data.address?.country ?? null,
      countryCode: data.address?.country_code?.toUpperCase() ?? null,
    });
  } catch {
    return NextResponse.json({ country: null, countryCode: null });
  }
}
