"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import {
  calculateGSI,
  checkAirspaceClosure,
  obfuscateCoord,
  type GSIResult,
  type AirspaceStatus,
  type ThermalHotspot,
  type ConflictPoint,
} from "@/lib/risk-intelligence";

const POLL_MS = 60_000;

export interface RiskIntelligenceState {
  gsi: GSIResult | null;
  airspace: AirspaceStatus | null;
  hotspots: ThermalHotspot[];
  loading: boolean;
}

export function useRiskIntelligence(): RiskIntelligenceState {
  const userLocation = useAppStore((s) => s.userLocation);
  const mapCenter = useMapStore((s) => s.center);
  const viewCountry = useMapStore((s) => s.viewCountry);
  const [gsi, setGsi] = useState<GSIResult | null>(null);
  const [airspace, setAirspace] = useState<AirspaceStatus | null>(null);
  const [hotspots, setHotspots] = useState<ThermalHotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const compute = useCallback(async () => {
    // Use GPS if available, otherwise fall back to map center
    const lat = userLocation?.lat ?? mapCenter[0];
    const lng = userLocation?.lng ?? mapCenter[1];
    if (!lat || !lng) return;
    setLoading(true);
    const oLat = obfuscateCoord(lat);
    const oLng = obfuscateCoord(lng);
    const radius = 0.05; // ~5km

    try {
      const [firmsRes, newsRes, flightsRes, airQualityRes, conflictRes] = await Promise.allSettled([
        // 1. NASA FIRMS thermal hotspots (5km bbox)
        fetch(`/api/firms?south=${oLat - radius}&north=${oLat + radius}&west=${oLng - radius}&east=${oLng + radius}`)
          .then((r) => r.json()) as Promise<{ hotspots?: ThermalHotspot[] }>,

        // 2. News sentiment (GDELT)
        fetch("/api/gdelt").then((r) => r.json()) as Promise<{ articles?: { severity: string }[] }>,

        // 3. Live flights for airspace closure detection
        fetch("/api/opensky").then((r) => r.json()) as Promise<{ lat: number; lng: number; onGround: boolean }[]>,

        // 4. Air quality
        fetch(`/api/google-air-quality?lat=${oLat}&lng=${oLng}`)
          .then((r) => r.json()) as Promise<{ aqi?: number | null; category?: string }>,

        // 5. ACLED conflict events for the country — used in conflict penalty
        fetch(`/api/acled?country=${encodeURIComponent(viewCountry)}`)
          .then((r) => r.json()) as Promise<{ features?: { properties: ConflictPoint; geometry: { coordinates: [number, number] } }[] }>,
      ]);

      const thermalHotspots: ThermalHotspot[] =
        firmsRes.status === "fulfilled" ? (firmsRes.value.hotspots ?? []) : [];

      const articles: { severity: string }[] =
        newsRes.status === "fulfilled" ? (newsRes.value.articles ?? []) : [];

      const flights: { lat: number; lng: number; onGround: boolean }[] =
        flightsRes.status === "fulfilled" && Array.isArray(flightsRes.value) ? flightsRes.value : [];

      const airQuality =
        airQualityRes.status === "fulfilled" ? airQualityRes.value : { aqi: null, category: "Unknown" };

      // Parse ACLED features into ConflictPoint[]
      const conflictEvents: ConflictPoint[] =
        conflictRes.status === "fulfilled" && Array.isArray(conflictRes.value.features)
          ? conflictRes.value.features.map((f) => ({
              ...f.properties,
              latitude: f.geometry.coordinates[1],
              longitude: f.geometry.coordinates[0],
            }))
          : [];

      setHotspots(thermalHotspots);

      const result = calculateGSI(
        0, // shelter count no longer drives the score
        lat, lng,
        thermalHotspots,
        articles,
        airQuality.aqi ?? null,
        airQuality.category ?? "Unknown",
        conflictEvents,
      );
      setGsi(result);

      const airStatus = checkAirspaceClosure(lat, lng, flights);
      setAirspace(airStatus);
    } catch (err) {
      console.error("[RiskIntelligence]", err);
    } finally {
      setLoading(false);
    }
  }, [userLocation, viewCountry, mapCenter]);

  // Reset GSI when country changes so dashboard shows loading state
  const prevCountry = useRef(viewCountry);
  useEffect(() => {
    if (prevCountry.current !== viewCountry) {
      prevCountry.current = viewCountry;
      setGsi(null);
      setAirspace(null);
    }
  }, [viewCountry]);

  useEffect(() => {
    void compute();
    timerRef.current = setInterval(() => void compute(), POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [compute]);

  useEffect(() => {
    const handler = () => { void compute(); };
    window.addEventListener("saferoute:refresh", handler);
    return () => window.removeEventListener("saferoute:refresh", handler);
  }, [compute]);

  return { gsi, airspace, hotspots, loading };
}
