"use client";
import { useEffect, useRef, useCallback } from "react";
import { useMapStore, type MapResource } from "@/store/mapStore";

// Maps layer key to the Overpass amenity/type query strings
const LAYER_TYPES: Record<string, string[]> = {
  hospitals:  ["hospital", "clinic", "doctors"],
  pharmacies: ["pharmacy"],
  shelters:   ["shelter", "social_facility", "community_centre", "place_of_worship", "school", "fire_station"],
  police:     ["police"],
  water:      ["water_point", "drinking_water"],
};

// Overpass queries use the `type` param in our /api/overpass route
// We need to fetch each type and merge results
async function fetchResourceType(type: string, bounds: { south: number; north: number; west: number; east: number }): Promise<MapResource[]> {
  try {
    const res = await fetch(
      `/api/overpass?type=${encodeURIComponent(type)}&south=${bounds.south}&north=${bounds.north}&west=${bounds.west}&east=${bounds.east}`
    );
    if (!res.ok) return [];
    const data = await res.json() as { resources?: MapResource[] };
    return data.resources ?? [];
  } catch {
    return [];
  }
}

export function useResourceLayers() {
  const { activeLayers, bounds, addResources, resources } = useMapStore();
  const fetchedRef = useRef<Set<string>>(new Set());

  const fetchLayer = useCallback(async (layerKey: string) => {
    if (!bounds) return;
    const cacheKey = `${layerKey}:${bounds.south.toFixed(2)},${bounds.north.toFixed(2)},${bounds.west.toFixed(2)},${bounds.east.toFixed(2)}`;
    if (fetchedRef.current.has(cacheKey)) return;
    fetchedRef.current.add(cacheKey);

    const types = LAYER_TYPES[layerKey] ?? [];
    const results: MapResource[] = [];

    await Promise.all(
      types.map(async (type) => {
        const items = await fetchResourceType(type, bounds);
        results.push(...items.map((r, i) => ({
          ...r,
          id: r.id || `${layerKey}-${type}-${i}-${r.latitude.toFixed(4)}-${r.longitude.toFixed(4)}`,
          type: layerKey === "hospitals" ? (r.type || "hospital") :
                layerKey === "pharmacies" ? "pharmacy" :
                layerKey === "shelters" ? "shelter" :
                layerKey === "police" ? "police" :
                "water_point",
        })));
      })
    );

    if (results.length > 0) {
      addResources(results);
    }
  }, [bounds, addResources]);

  // When a resource layer is toggled on, fetch its resources
  useEffect(() => {
    const layerKeys = ["hospitals", "pharmacies", "shelters", "police", "water"] as const;
    for (const key of layerKeys) {
      if (activeLayers[key]) {
        void fetchLayer(key);
      }
    }
  }, [
    activeLayers.hospitals,
    activeLayers.pharmacies,
    activeLayers.shelters,
    activeLayers.police,
    activeLayers.water,
    bounds,
    fetchLayer,
  ]);

  // Clear cache when bounds change significantly (user panned far)
  const prevBoundsRef = useRef(bounds);
  useEffect(() => {
    if (!bounds || !prevBoundsRef.current) { prevBoundsRef.current = bounds; return; }
    const prev = prevBoundsRef.current;
    const dLat = Math.abs(bounds.south - prev.south);
    const dLng = Math.abs(bounds.west - prev.west);
    if (dLat > 0.5 || dLng > 0.5) {
      fetchedRef.current.clear();
      prevBoundsRef.current = bounds;
    }
  }, [bounds]);

  // Listen for refresh event — clear cache and re-fetch active layers
  useEffect(() => {
    const handler = () => {
      fetchedRef.current.clear();
      const layerKeys = ["hospitals", "pharmacies", "shelters", "police", "water"] as const;
      for (const key of layerKeys) {
        if (activeLayers[key]) void fetchLayer(key);
      }
    };
    window.addEventListener("saferoute:refresh", handler);
    return () => window.removeEventListener("saferoute:refresh", handler);
  }, [activeLayers, fetchLayer]);
}
