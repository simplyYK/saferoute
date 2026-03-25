import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const TRAVEL_MODE_MAP: Record<string, string> = {
  foot: "WALK",
  walking: "WALK",
  car: "DRIVE",
  driving: "DRIVE",
  bike: "BICYCLE",
  cycling: "BICYCLE",
};

interface GoogleRoute {
  distanceMeters: number;
  duration: string; // e.g. "1234s"
  polyline: { encodedPolyline: string };
  legs: Array<{
    distanceMeters: number;
    duration: string;
    steps: Array<{
      distanceMeters: number;
      staticDuration: string;
      polyline: { encodedPolyline: string };
      navigationInstruction?: {
        maneuver?: string;
        instructions?: string;
      };
    }>;
  }>;
  routeLabels?: string[];
}

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    // Google Routes API returns coordinates as [lng, lat] in GeoJSON
    // But encoded polylines use lat/lng * 1e5
    coords.push([lng / 1e5, lat / 1e5]);
  }

  return coords;
}

function parseDuration(d: string): number {
  return parseInt(d.replace("s", ""), 10) || 0;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startLat = searchParams.get("startLat");
  const startLng = searchParams.get("startLng");
  const endLat = searchParams.get("endLat");
  const endLng = searchParams.get("endLng");
  const profile = searchParams.get("profile") || "foot";
  const alternatives = searchParams.get("alternatives") !== "false";

  if (!startLat || !startLng || !endLat || !endLng) {
    return NextResponse.json({ error: "Missing parameters", routes: [] }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "Google API key not configured", routes: [] }, { status: 503 });
  }

  const travelMode = TRAVEL_MODE_MAP[profile] || "WALK";

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.routeLabels",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: parseFloat(startLat), longitude: parseFloat(startLng) } },
        },
        destination: {
          location: { latLng: { latitude: parseFloat(endLat), longitude: parseFloat(endLng) } },
        },
        travelMode,
        computeAlternativeRoutes: alternatives,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
        languageCode: "en",
        units: "METRIC",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Google Routes]", res.status, errText);
      return NextResponse.json({ error: "Route calculation failed", routes: [] }, { status: 500 });
    }

    const data = (await res.json()) as { routes?: GoogleRoute[] };

    if (!data.routes?.length) {
      return NextResponse.json({ error: "No route found", routes: [] }, { status: 404 });
    }

    const routes = data.routes.map((route, i) => {
      const durationSec = parseDuration(route.duration);
      const distanceM = route.distanceMeters;
      const coordinates = decodePolyline(route.polyline.encodedPolyline);

      const steps = (route.legs[0]?.steps ?? []).map((step) => ({
        instruction: step.navigationInstruction?.instructions ?? step.navigationInstruction?.maneuver ?? "Continue",
        distance: step.distanceMeters ?? 0,
        duration: parseDuration(step.staticDuration),
        name: step.navigationInstruction?.instructions ?? "",
      }));

      return {
        id: `route-${i}`,
        distance: distanceM,
        distanceKm: Math.round((distanceM / 1000) * 10) / 10,
        duration: durationSec,
        durationMinutes: Math.round(durationSec / 60),
        geometry: {
          type: "LineString",
          coordinates,
        },
        steps,
        safetyScore: 0,
      };
    });

    return NextResponse.json({ routes, count: routes.length });
  } catch (err) {
    console.error("[Google Routes]", err);
    return NextResponse.json({ error: "Failed to calculate route", routes: [] }, { status: 500 });
  }
}
