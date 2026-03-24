"use client";
import { useState, useEffect } from "react";
import type { ConflictEvent } from "@/types/conflict";

export function useConflictData(country = "Ukraine") {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_() {
      try {
        setLoading(true);
        const res = await fetch(`/api/acled?country=${encodeURIComponent(country)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const features = json.features || [];
        setEvents(
          features.map(
            (f: { properties: ConflictEvent; geometry: { coordinates: [number, number] } }) => ({
              ...f.properties,
              latitude: f.geometry.coordinates[1],
              longitude: f.geometry.coordinates[0],
            })
          )
        );
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load conflict data");
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, [country]);

  return { events, loading, error };
}
