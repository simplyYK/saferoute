// Tool definitions for the AI agent — used in system prompt and for OpenAI function calling
export const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_places",
      description: "Search for places, addresses, or locations by name. Returns coordinates and details. Use when user asks about a specific place or wants to find a location.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (e.g. 'Kyiv central hospital', 'US Embassy Beirut')" },
          lat: { type: "number", description: "Optional latitude to bias search near" },
          lng: { type: "number", description: "Optional longitude to bias search near" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_nearby_resources",
      description: "Find nearby resources like hospitals, pharmacies, shelters, police stations, embassies, or water points. Returns detailed place info from Google.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude to search around" },
          lng: { type: "number", description: "Longitude to search around" },
          type: { type: "string", enum: ["hospital", "clinic", "pharmacy", "shelter", "police", "fire_station", "embassy", "water_point"], description: "Type of resource" },
          radius: { type: "number", description: "Search radius in meters (default 5000)" },
        },
        required: ["lat", "lng", "type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compute_route",
      description: "Calculate a route between two points with safety scoring. Use when the user asks for directions, routes, or how to get somewhere.",
      parameters: {
        type: "object",
        properties: {
          startLat: { type: "number", description: "Origin latitude" },
          startLng: { type: "number", description: "Origin longitude" },
          endLat: { type: "number", description: "Destination latitude" },
          endLng: { type: "number", description: "Destination longitude" },
          profile: { type: "string", enum: ["foot", "car", "bike"], description: "Travel mode (default: foot)" },
        },
        required: ["startLat", "startLng", "endLat", "endLng"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_air_quality",
      description: "Get current air quality index (AQI) and health recommendations for a location. Use when user asks about air quality or environmental conditions.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_elevation",
      description: "Get elevation data for locations. Returns elevation in meters above sea level.",
      parameters: {
        type: "object",
        properties: {
          locations: { type: "string", description: "Pipe-separated lat,lng pairs (e.g. '48.85,2.35|40.71,-74.01')" },
        },
        required: ["locations"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reverse_geocode",
      description: "Convert coordinates to a human-readable address. Use when you have coordinates and need to identify the location name.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_timezone",
      description: "Get timezone information and local time for a location.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_conflict_events",
      description: "Get recent conflict events (battles, explosions, violence) from ACLED for a country.",
      parameters: {
        type: "object",
        properties: {
          country: { type: "string", description: "Country name (default: Ukraine)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_seismic_data",
      description: "Get recent earthquake/seismic activity data globally. Can indicate artillery in conflict zones.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_flights",
      description: "Get live commercial flight positions from OpenSky Network.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_military_aircraft",
      description: "Get live military aircraft positions from ADSB Exchange (unfiltered).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_news",
      description: "Get latest crisis news from Reuters, BBC, Al Jazeera with severity classification.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_thermal_hotspots",
      description: "Get NASA FIRMS thermal/fire anomaly data for a bounding box. Useful for detecting fires, explosions, or thermal events.",
      parameters: {
        type: "object",
        properties: {
          south: { type: "number" }, north: { type: "number" },
          west: { type: "number" }, east: { type: "number" },
        },
        required: ["south", "north", "west", "east"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fly_to_location",
      description: "Navigate the map to a specific location. Use when you want to show the user a location on the map.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
          name: { type: "string", description: "Location name for display" },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "toggle_layer",
      description: "Toggle a map layer on or off. Available layers: conflictEvents, reports, resources, dangerZones.",
      parameters: {
        type: "object",
        properties: {
          layer: { type: "string", enum: ["conflictEvents", "reports", "resources", "dangerZones"] },
          enabled: { type: "boolean", description: "True to enable, false to disable. Omit to toggle." },
        },
        required: ["layer"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "plan_route",
      description: "Open the route planner with pre-filled origin and destination. Use when the user asks you to plan or calculate a route for them.",
      parameters: {
        type: "object",
        properties: {
          origin: {
            type: "object",
            properties: { lat: { type: "number" }, lng: { type: "number" }, name: { type: "string" } },
            required: ["lat", "lng", "name"],
          },
          destination: {
            type: "object",
            properties: { lat: { type: "number" }, lng: { type: "number" }, name: { type: "string" } },
            required: ["lat", "lng", "name"],
          },
          profile: { type: "string", enum: ["foot", "car", "bike"] },
        },
        required: ["origin", "destination"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "submit_report",
      description: "Submit a community hazard/safety report on behalf of the user. Use when user wants to report a threat, hazard, or safety update.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["shelling", "gunfire", "checkpoint", "safe_corridor", "road_blocked", "building_damage", "military_movement", "aid_distribution", "other"] },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          title: { type: "string", description: "Short title for the report" },
          description: { type: "string", description: "Detailed description" },
          lat: { type: "number" }, lng: { type: "number" },
        },
        required: ["category", "severity", "title", "description", "lat", "lng"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_visual_mode",
      description: "Change the map visual mode. Options: standard, flir (thermal), night (night vision), crt (retro terminal), blackout (emergency dark).",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["standard", "flir", "night", "crt", "blackout"] },
        },
        required: ["mode"],
      },
    },
  },
];

export const TOOLS_DESCRIPTION = AGENT_TOOLS.map(
  (t) => `- **${t.function.name}**: ${t.function.description}`
).join("\n");
