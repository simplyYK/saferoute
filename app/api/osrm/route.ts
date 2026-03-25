import { NextRequest, NextResponse } from "next/server";

type OsrmMode = "foot" | "driving" | "cycling";

function mapProfile(mode: string): OsrmMode {
  const m = mode.toLowerCase();
  if (m === "car" || m === "driving") return "driving";
  if (m === "bike" || m === "cycling" || m === "bicycle") return "cycling";
  return "foot";
}

function buildOsrmUrl(
  profile: OsrmMode,
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  alternatives: boolean
) {
  const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
  return `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=true`;
}

type OsrmBody = {
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  mode?: string;
  alternatives?: boolean;
};

function humanizeStep(step: {
  maneuver: { type: string; modifier?: string };
  name: string;
}): string {
  const { maneuver: m, name } = step;
  const road = name || "unnamed road";
  const mod = (m.modifier || "").replace(/^slight\s+/i, "").replace(/^sharp\s+/i, "");

  switch (m.type) {
    case "turn":
    case "on ramp":
    case "off ramp":
      return mod ? `Turn ${mod} on ${road}` : `Turn on ${road}`;
    case "roundabout":
    case "rotary":
    case "roundabout turn":
      return `Roundabout · ${road}`;
    case "arrive":
      return "Arrive at destination";
    case "depart":
    case "continue":
      return mod && mod !== "straight" ? `Head ${mod} on ${road}` : `Continue on ${road}`;
    case "merge":
      return `Merge on ${road}`;
    case "fork":
      return `Fork ${mod || ""} on ${road}`.trim();
    case "end of road":
      return `End of road · turn ${mod || ""} on ${road}`.trim();
    default:
      return `${m.type}${mod ? ` ${mod}` : ""} · ${road}`;
  }
}

async function fetchOsrmRoutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  profile: string,
  alternatives: boolean
) {
  const osrmProfile = mapProfile(profile);
  const url = buildOsrmUrl(osrmProfile, fromLng, fromLat, toLng, toLat, alternatives);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = await res.json();

  if (json.code !== "Ok" || !json.routes?.length) {
    return { routes: [] as unknown[], error: "No route found" as string | null };
  }

  const routes = json.routes.map(
    (
      route: {
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
      },
      i: number
    ) => ({
      id: `route-${i}`,
      distance: route.distance,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      duration: route.duration,
      durationMinutes: Math.round(route.duration / 60),
      geometry: route.geometry,
      steps: (route.legs[0]?.steps || []).map((step) => ({
        instruction: humanizeStep(step),
        distance: step.distance,
        duration: step.duration,
        name: step.name || "",
        maneuver: step.maneuver,
      })),
      safetyScore: 0,
    })
  );

  return { routes, error: null as string | null };
}

export async function POST(request: NextRequest) {
  let body: OsrmBody;
  try {
    body = (await request.json()) as OsrmBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", routes: [] }, { status: 400 });
  }

  const fromLat = body.fromLat;
  const fromLng = body.fromLng;
  const toLat = body.toLat;
  const toLng = body.toLng;
  const mode = body.mode || "foot";
  const alternatives = body.alternatives !== false;

  if (
    typeof fromLat !== "number" ||
    typeof fromLng !== "number" ||
    typeof toLat !== "number" ||
    typeof toLng !== "number"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fromLat, fromLng, toLat, toLng", routes: [] },
      { status: 400 }
    );
  }

  try {
    const { routes, error } = await fetchOsrmRoutes(fromLat, fromLng, toLat, toLng, mode, alternatives);
    if (error || routes.length === 0) {
      return NextResponse.json({ error: error || "No route found", routes: [] }, { status: 404 });
    }
    return NextResponse.json({ routes, count: routes.length });
  } catch (err) {
    console.error("[OSRM]", err);
    return NextResponse.json({ error: "Failed to calculate route", routes: [] }, { status: 500 });
  }
}

/** Legacy query API — prefer POST with JSON body. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startLat = searchParams.get("startLat");
  const startLng = searchParams.get("startLng");
  const endLat = searchParams.get("endLat");
  const endLng = searchParams.get("endLng");
  const profile = searchParams.get("profile") || "foot";
  const alternatives = searchParams.get("alternatives") !== "false";

  if (!startLat || !startLng || !endLat || !endLng) {
    return NextResponse.json({ error: "Missing parameters: startLat, startLng, endLat, endLng", routes: [] }, { status: 400 });
  }

  try {
    const { routes, error } = await fetchOsrmRoutes(
      parseFloat(startLat),
      parseFloat(startLng),
      parseFloat(endLat),
      parseFloat(endLng),
      profile,
      alternatives
    );
    if (error || routes.length === 0) {
      return NextResponse.json({ error: error || "No route found", routes: [] }, { status: 404 });
    }
    return NextResponse.json({ routes, count: routes.length });
  } catch (err) {
    console.error("[OSRM]", err);
    return NextResponse.json({ error: "Failed to calculate route", routes: [] }, { status: 500 });
  }
}
