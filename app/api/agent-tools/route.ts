import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ToolCall = {
  name: string;
  args: Record<string, unknown>;
};

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function fetchInternal(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  return res.json();
}

async function executeTool(tool: ToolCall): Promise<unknown> {
  switch (tool.name) {
    case "search_places": {
      const { query, lat, lng } = tool.args as { query: string; lat?: number; lng?: number };
      const params = new URLSearchParams({ q: query });
      if (lat) params.set("lat", String(lat));
      if (lng) params.set("lng", String(lng));
      return fetchInternal(`/api/places?${params}`);
    }

    case "find_nearby_resources": {
      const { lat, lng, type, radius } = tool.args as { lat: number; lng: number; type: string; radius?: number };
      const data = await fetchInternal("/api/google-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, type, radius: radius ?? 5000 }),
      }) as { resources?: Array<Record<string, unknown>>; count?: number };
      // Return resources data for the AI AND an action so frontend can display markers on map
      return {
        ...data,
        action: "showResources",
        resourceType: type,
      };
    }

    case "compute_route": {
      const { startLat, startLng, endLat, endLng, profile } = tool.args as {
        startLat: number; startLng: number; endLat: number; endLng: number; profile?: string;
      };
      return fetchInternal(
        `/api/osrm?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}&profile=${profile ?? "foot"}&alternatives=true`
      );
    }

    case "get_air_quality": {
      const { lat, lng } = tool.args as { lat: number; lng: number };
      return fetchInternal(`/api/google-air-quality?lat=${lat}&lng=${lng}`);
    }

    case "get_elevation": {
      const { locations } = tool.args as { locations: string };
      return fetchInternal(`/api/google-elevation?locations=${encodeURIComponent(locations)}`);
    }

    case "reverse_geocode": {
      const { lat, lng } = tool.args as { lat: number; lng: number };
      return fetchInternal(`/api/google-geocode?lat=${lat}&lng=${lng}`);
    }

    case "get_timezone": {
      const { lat, lng } = tool.args as { lat: number; lng: number };
      return fetchInternal(`/api/google-timezone?lat=${lat}&lng=${lng}`);
    }

    case "get_conflict_events": {
      const { country } = tool.args as { country?: string };
      return fetchInternal(`/api/acled?country=${country ?? "Ukraine"}`);
    }

    case "get_seismic_data": {
      return fetchInternal("/api/seismic");
    }

    case "get_flights": {
      return fetchInternal("/api/opensky");
    }

    case "get_military_aircraft": {
      return fetchInternal("/api/adsb");
    }

    case "get_news": {
      return fetchInternal("/api/gdelt");
    }

    case "get_thermal_hotspots": {
      const { south, north, west, east } = tool.args as { south: number; north: number; west: number; east: number };
      return fetchInternal(`/api/firms?south=${south}&north=${north}&west=${west}&east=${east}`);
    }

    // Client-side actions — return instructions for the frontend to execute
    case "fly_to_location": {
      const { lat, lng, name } = tool.args as { lat: number; lng: number; name?: string };
      return { action: "flyTo", lat, lng, name };
    }

    case "toggle_layer": {
      const { layer, enabled } = tool.args as { layer: string; enabled?: boolean };
      return { action: "toggleLayer", layer, enabled };
    }

    case "plan_route": {
      const { origin, destination, profile } = tool.args as {
        origin: { lat: number; lng: number; name: string };
        destination: { lat: number; lng: number; name: string };
        profile?: string;
      };
      return { action: "planRoute", origin, destination, profile: profile ?? "foot" };
    }

    case "submit_report": {
      const { category, severity, title, description, lat, lng } = tool.args as {
        category: string; severity: string; title: string; description: string; lat: number; lng: number;
      };
      return { action: "submitReport", category, severity, title, description, lat, lng };
    }

    case "set_visual_mode": {
      const { mode } = tool.args as { mode: string };
      return { action: "setVisualMode", mode };
    }

    case "get_conflict_stats": {
      const { country } = tool.args as { country: string };
      return fetchInternal(`/api/conflict-stats?country=${encodeURIComponent(country)}`);
    }

    case "get_weather": {
      const { lat, lng } = tool.args as { lat: number; lng: number };
      return fetchInternal(`/api/weather?lat=${lat}&lng=${lng}`);
    }

    default:
      return { error: `Unknown tool: ${tool.name}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { tools: ToolCall[] };
    const results = await Promise.all(
      body.tools.map(async (tool) => {
        try {
          const result = await executeTool(tool);
          return { name: tool.name, result };
        } catch (err) {
          return { name: tool.name, error: String(err) };
        }
      })
    );
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[Agent Tools]", err);
    return NextResponse.json({ error: "Tool execution failed" }, { status: 500 });
  }
}
