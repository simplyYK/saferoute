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

      // Fetch both ACLED/seed data AND live GDELT events in parallel
      const [acledRes, gdeltRes] = await Promise.allSettled([
        fetch(`/api/acled?country=${encodeURIComponent(country)}`).then((r) => r.json()),
        fetch(`/api/gdelt-events?country=${encodeURIComponent(country)}`).then((r) => r.json()),
      ]);

      const acledFeatures =
        acledRes.status === "fulfilled" ? acledRes.value.features || [] : [];
      const gdeltFeatures =
        gdeltRes.status === "fulfilled" ? gdeltRes.value.features || [] : [];

      // Parse ACLED/seed features
      const acledEvents: ConflictEvent[] = acledFeatures.map(
        (f: { properties: ConflictEvent; geometry: { coordinates: [number, number] } }) => ({
          ...f.properties,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
        })
      );

      // Parse GDELT features — these are live geolocated conflict events
      const gdeltEvents: ConflictEvent[] = gdeltFeatures.map(
        (f: { properties: Record<string, unknown>; geometry: { coordinates: [number, number] } }) => ({
          id: String(f.properties.id || ""),
          event_date: String(f.properties.event_date || ""),
          event_type: String(f.properties.event_type || ""),
          sub_event_type: String(f.properties.sub_event_type || ""),
          actor1: String(f.properties.actor1 || ""),
          actor2: String(f.properties.actor2 || ""),
          location: String(f.properties.location || ""),
          admin1: String(f.properties.admin1 || ""),
          fatalities: Number(f.properties.fatalities) || 0,
          notes: String(f.properties.notes || ""),
          source: String(f.properties.source || "GDELT"),
          severity: (f.properties.severity as ConflictEvent["severity"]) || "medium",
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
        })
      );

      // Merge: ACLED/seed events first, then GDELT events
      // Deduplicate by proximity (within ~1km and same date = likely same event)
      const merged = [...acledEvents];
      for (const ge of gdeltEvents) {
        const isDuplicate = acledEvents.some(
          (ae) =>
            Math.abs(ae.latitude - ge.latitude) < 0.01 &&
            Math.abs(ae.longitude - ge.longitude) < 0.01 &&
            ae.event_date === ge.event_date
        );
        if (!isDuplicate) {
          merged.push(ge);
        }
      }

      // Update cache
      conflictCache.set(country, { events: merged, ts: Date.now() });
      if (mountRef.current) {
        setEvents(merged);
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
