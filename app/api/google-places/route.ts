import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  rating?: number;
  currentOpeningHours?: { openNow?: boolean };
  internationalPhoneNumber?: string;
  websiteUri?: string;
}

// Text search (autocomplete-like)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!q || q.length < 2) return NextResponse.json({ predictions: [] });
  if (!API_KEY) return NextResponse.json({ predictions: [], error: "No Google API key" });

  try {
    const body: Record<string, unknown> = {
      textQuery: q,
      maxResultCount: 8,
    };

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
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[Google Places]", res.status, await res.text());
      return NextResponse.json({ predictions: [] });
    }

    const data = (await res.json()) as { places?: GooglePlace[] };
    const predictions = (data.places ?? []).map((p) => ({
      place_id: p.id,
      description: p.formattedAddress ?? p.displayName?.text ?? "",
      structured_formatting: {
        main_text: p.displayName?.text ?? "",
        secondary_text: p.formattedAddress ?? "",
      },
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      types: p.types,
    }));

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("[Google Places]", err);
    return NextResponse.json({ predictions: [] });
  }
}

// Nearby search for resources (hospitals, shelters, etc.)
export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ resources: [], error: "No Google API key" });

  const body = (await req.json()) as {
    lat: number;
    lng: number;
    radius?: number;
    type: string;
  };

  const typeMap: Record<string, string[]> = {
    hospital: ["hospital"],
    clinic: ["doctor", "health"],
    pharmacy: ["pharmacy"],
    shelter: ["lodging", "church", "community_center"],
    police: ["police"],
    fire_station: ["fire_station"],
    embassy: ["embassy"],
    water_point: ["convenience_store", "supermarket"],
  };

  const includedTypes = typeMap[body.type] ?? [body.type];

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.currentOpeningHours,places.internationalPhoneNumber,places.websiteUri",
      },
      body: JSON.stringify({
        includedTypes,
        locationRestriction: {
          circle: {
            center: { latitude: body.lat, longitude: body.lng },
            radius: body.radius ?? 5000,
          },
        },
        maxResultCount: 20,
      }),
    });

    if (!res.ok) {
      console.error("[Google Places Nearby]", res.status, await res.text());
      return NextResponse.json({ resources: [] });
    }

    const data = (await res.json()) as { places?: GooglePlace[] };
    const resources = (data.places ?? []).map((p) => ({
      id: `gp-${p.id}`,
      type: body.type,
      name: p.displayName?.text ?? "Unknown",
      latitude: p.location?.latitude ?? 0,
      longitude: p.location?.longitude ?? 0,
      phone: p.internationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      address: p.formattedAddress ?? null,
      operating_hours: p.currentOpeningHours?.openNow != null
        ? (p.currentOpeningHours.openNow ? "Open now" : "Closed")
        : null,
      rating: p.rating ?? null,
      status: p.currentOpeningHours?.openNow ? "open" : "unknown",
      verified: true,
      source: "google",
      services: [],
    }));

    return NextResponse.json({ resources, count: resources.length });
  } catch (err) {
    console.error("[Google Places Nearby]", err);
    return NextResponse.json({ resources: [], error: "Failed to fetch nearby places" });
  }
}
