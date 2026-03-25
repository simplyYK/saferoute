import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const GOOGLE_TRAVEL_MODE: Record<string, string> = {
  foot: "WALK", walking: "WALK",
  car: "DRIVE", driving: "DRIVE",
  bike: "BICYCLE", cycling: "BICYCLE",
};

const OSRM_PROFILE: Record<string, string> = {
  foot: "foot", walking: "foot",
  car: "driving", driving: "driving",
  bike: "cycling", cycling: "cycling",
};

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

function parseDuration(d: string): number {
  return parseInt(d.replace("s", ""), 10) || 0;
}

interface GoogleRoute {
  distanceMeters: number;
  duration: string;
  polyline: { encodedPolyline: string };
  legs: Array<{
    distanceMeters: number;
    duration: string;
    steps: Array<{
      distanceMeters: number;
      staticDuration: string;
      navigationInstruction?: { maneuver?: string; instructions?: string };
    }>;
  }>;
}

async function googleRoutes(startLat: string, startLng: string, endLat: string, endLng: string, profile: string) {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY!,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.distanceMeters,routes.legs.duration",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: parseFloat(startLat), longitude: parseFloat(startLng) } } },
      destination: { location: { latLng: { latitude: parseFloat(endLat), longitude: parseFloat(endLng) } } },
      travelMode: GOOGLE_TRAVEL_MODE[profile] || "WALK",
      computeAlternativeRoutes: true,
      languageCode: "en",
      units: "METRIC",
    }),
  });

  if (!res.ok) throw new Error(`Google Routes ${res.status}`);
  const data = (await res.json()) as { routes?: GoogleRoute[] };
  if (!data.routes?.length) throw new Error("No routes");

  return data.routes.map((route, i) => {
    const durationSec = parseDuration(route.duration);
    const distanceM = route.distanceMeters;
    return {
      id: `route-${i}`,
      distance: distanceM,
      distanceKm: Math.round((distanceM / 1000) * 10) / 10,
      duration: durationSec,
      durationMinutes: Math.round(durationSec / 60),
      geometry: { type: "LineString", coordinates: decodePolyline(route.polyline.encodedPolyline) },
      steps: (route.legs[0]?.steps ?? []).map((step) => ({
        instruction: step.navigationInstruction?.instructions ?? step.navigationInstruction?.maneuver ?? "Continue",
        distance: step.distanceMeters ?? 0,
        duration: parseDuration(step.staticDuration),
        name: step.navigationInstruction?.instructions ?? "",
      })),
      safetyScore: 0,
      source: "google",
    };
  });
}

async function osrmRoutes(startLat: string, startLng: string, endLat: string, endLng: string, profile: string, alternatives: string) {
  const osrmProfile = OSRM_PROFILE[profile] || "foot";
  const coords = `${startLng},${startLat};${endLng},${endLat}`;
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = await res.json();
  if (json.code !== "Ok" || !json.routes?.length) throw new Error("No OSRM routes");

  return json.routes.map((route: {
    distance: number; duration: number;
    geometry: { type: string; coordinates: [number, number][] };
    legs: Array<{ steps: Array<{ maneuver: { type: string; modifier?: string }; name: string; distance: number; duration: number }> }>;
  }, i: number) => ({
    id: `route-${i}`,
    distance: route.distance,
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    duration: route.duration,
    durationMinutes: Math.round(route.duration / 60),
    geometry: route.geometry,
    steps: (route.legs[0]?.steps || []).map((step) => ({
      instruction: `${step.maneuver.type}${step.maneuver.modifier ? " " + step.maneuver.modifier : ""} on ${step.name || "unnamed road"}`,
      distance: step.distance,
      duration: step.duration,
      name: step.name,
    })),
    safetyScore: 0,
    source: "osrm",
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startLat = searchParams.get("startLat");
  const startLng = searchParams.get("startLng");
  const endLat = searchParams.get("endLat");
  const endLng = searchParams.get("endLng");
  const profile = searchParams.get("profile") || "foot";
  const alternatives = searchParams.get("alternatives") || "true";
  const via = searchParams.get("via"); // optional "lat,lng" waypoint for avoidance routing

  if (!startLat || !startLng || !endLat || !endLng) {
    return NextResponse.json({ error: "Missing parameters: startLat, startLng, endLat, endLng" }, { status: 400 });
  }

  // If via waypoint provided, skip Google (no waypoint support) and use OSRM directly
  if (via) {
    try {
      const [viaLat, viaLng] = via.split(",");
      const osrmProfile = OSRM_PROFILE[profile] || "foot";
      const coords = `${startLng},${startLat};${viaLng},${viaLat};${endLng},${endLat}`;
      const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=false`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.code === "Ok" && json.routes?.length) {
          const routes = json.routes.map((route: { distance: number; duration: number; geometry: { type: string; coordinates: [number, number][] }; legs: Array<{ steps: Array<{ maneuver: { type: string; modifier?: string }; name: string; distance: number; duration: number }> }> }, i: number) => ({
            id: `avoid-route-${i}`,
            distance: route.distance,
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            duration: route.duration,
            durationMinutes: Math.round(route.duration / 60),
            geometry: route.geometry,
            steps: (route.legs?.flatMap((l) => l.steps) || []).map((step) => ({
              instruction: `${step.maneuver.type}${step.maneuver.modifier ? " " + step.maneuver.modifier : ""} on ${step.name || "unnamed road"}`,
              distance: step.distance,
              duration: step.duration,
              name: step.name,
            })),
            safetyScore: 0,
            source: "osrm-avoidance",
          }));
          return NextResponse.json({ routes, count: routes.length });
        }
      }
    } catch { /* fall through to normal routing */ }
  }

  // Try Google Routes first, fall back to OSRM
  if (GOOGLE_KEY) {
    try {
      const routes = await googleRoutes(startLat, startLng, endLat, endLng, profile);
      return NextResponse.json({ routes, count: routes.length });
    } catch (err) {
      console.warn("[Routes] Google failed, falling back to OSRM:", err);
    }
  }

  try {
    const routes = await osrmRoutes(startLat, startLng, endLat, endLng, profile, alternatives);
    return NextResponse.json({ routes, count: routes.length });
  } catch (err) {
    console.error("[OSRM]", err);
    return NextResponse.json({ error: "Failed to calculate route", routes: [] }, { status: 500 });
  }
}
