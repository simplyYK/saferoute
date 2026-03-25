import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(req: NextRequest) {
  if (!KEY) return NextResponse.json({ predictions: [] });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const placeId = searchParams.get("place_id");

  try {
    if (placeId) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name,formatted_address&key=${KEY}`
      );
      return NextResponse.json(await res.json());
    }

    if (q && q.length >= 2) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${KEY}`
      );
      return NextResponse.json(await res.json());
    }

    return NextResponse.json({ predictions: [] });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
