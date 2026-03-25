"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ConflictEvent } from "@/types/conflict";

// Client-side cache: country -> { events, timestamp }
const conflictCache = new Map<string, { events: ConflictEvent[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useConflictData(country = "Ukraine") {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountRef = useRef(true);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless forced)
    if (!forceRefresh) {
      const cached = conflictCache.get(country);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setEvents(cached.events);
        setLoading(false);
        setError(null);
        return;
      }
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/acled?country=${encodeURIComponent(country)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const features = json.features || [];
      const parsed: ConflictEvent[] = features.map(
        (f: { properties: ConflictEvent; geometry: { coordinates: [number, number] } }) => ({
          ...f.properties,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
        })
      );
      // Update cache
      conflictCache.set(country, { events: parsed, ts: Date.now() });
      if (mountRef.current) {
        setEvents(parsed);
        setError(null);
      }
    } catch (e) {
      if (mountRef.current) {
        setError(e instanceof Error ? e.message : "Failed to load conflict data");
      }
    } finally {
      if (mountRef.current) {
        setLoading(false);
      }
    }
  }, [country]);

  useEffect(() => {
    mountRef.current = true;
    fetchData();
    return () => { mountRef.current = false; };
  }, [fetchData]);

  useEffect(() => {
    const handler = () => { void fetchData(true); };
    window.addEventListener("saferoute:refresh", handler);
    return () => window.removeEventListener("saferoute:refresh", handler);
  }, [fetchData]);

  return { events, loading, error, refetch: () => fetchData(true) };
}
