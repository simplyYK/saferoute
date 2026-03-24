import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startLat = searchParams.get("startLat");
  const startLng = searchParams.get("startLng");
  const endLat = searchParams.get("endLat");
  const endLng = searchParams.get("endLng");
  const profile = searchParams.get("profile") || "foot";
  const alternatives = searchParams.get("alternatives") || "true";

  if (!startLat || !startLng || !endLat || !endLng) {
    return NextResponse.json({ error: "Missing parameters: startLat, startLng, endLat, endLng" }, { status: 400 });
  }

  const profileMap: Record<string, string> = {
    foot: "foot",
    walking: "foot",
    car: "driving",
    driving: "driving",
    bike: "cycling",
    cycling: "cycling",
  };
  const osrmProfile = profileMap[profile] || "foot";
  const coords = `${startLng},${startLat};${endLng},${endLat}`;
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const json = await res.json();

    if (json.code !== "Ok" || !json.routes?.length) {
      return NextResponse.json({ error: "No route found", routes: [] }, { status: 404 });
    }

    const routes = json.routes.map((route: {
      distance: number;
      duration: number;
      geometry: { type: string; coordinates: [number, number][] };
      legs: Array<{
        steps: Array<{
          maneuver: { type: string; modifier?: string };
          name: string;
          distance: number;
          duration: number;
        }>;
      }>;
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
        maneuver: step.maneuver,
      })),
      safetyScore: 0, // Calculated client-side
    }));

    return NextResponse.json({ routes, count: routes.length });
  } catch (err) {
    console.error("[OSRM]", err);
    return NextResponse.json({ error: "Failed to calculate route", routes: [] }, { status: 500 });
  }
}
