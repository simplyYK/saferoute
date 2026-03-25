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
const DEBOUNCE_MS = 800; // debounce map pans to avoid hammering APIs

export interface RiskIntelligenceState {
  gsi: GSIResult | null;
  airspace: AirspaceStatus | null;
  hotspots: ThermalHotspot[];
  loading: boolean;
}

export function useRiskIntelligence(): RiskIntelligenceState {
  const userLocation = useAppStore((s) => s.userLocation);
  const centerLat = useMapStore((s) => s.center[0]);
  const centerLng = useMapStore((s) => s.center[1]);
  const viewCountry = useMapStore((s) => s.viewCountry);

  const [gsi, setGsi] = useState<GSIResult | null>(null);
  const [airspace, setAirspace] = useState<AirspaceStatus | null>(null);
  const [hotspots, setHotspots] = useState<ThermalHotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const compute = useCallback(async () => {
    // Use GPS only in "My Location" mode; otherwise use the map center
    // so the GSI reflects the country the user is viewing, not their physical location
    const lat = viewCountry === "My Location" && userLocation ? userLocation.lat : centerLat;
    const lng = viewCountry === "My Location" && userLocation ? userLocation.lng : centerLng;
    if (lat === 0 && lng === 0) return;
    setLoading(true);
    const oLat = obfuscateCoord(lat);
    const oLng = obfuscateCoord(lng);
    // Use 0.3° (~33km) radius so FIRMS fetch covers the full 20km thermal detection range
    const firmsRadius = 0.3;

    try {
      const [firmsRes, newsRes, flightsRes, airQualityRes, conflictRes] = await Promise.allSettled([
        fetch(`/api/firms?south=${oLat - firmsRadius}&north=${oLat + firmsRadius}&west=${oLng - firmsRadius}&east=${oLng + firmsRadius}`)
          .then((r) => r.json()) as Promise<{ hotspots?: ThermalHotspot[] }>,
        fetch("/api/gdelt").then((r) => r.json()) as Promise<{ articles?: { severity: string }[] }>,
        fetch(`/api/opensky?lat=${oLat}&lng=${oLng}`).then((r) => r.json()) as Promise<{ lat: number; lng: number; onGround: boolean }[]>,
        fetch(`/api/google-air-quality?lat=${oLat}&lng=${oLng}`)
          .then((r) => r.json()) as Promise<{ aqi?: number | null; category?: string }>,
        fetch(`/api/acled?country=${encodeURIComponent(viewCountry)}`)
          .then((r) => r.json()) as Promise<{ features?: { properties: ConflictPoint; geometry: { coordinates: [number, number] } }[] }>,
      ]);

      if (!mountedRef.current) return;

      const thermalHotspots: ThermalHotspot[] =
        firmsRes.status === "fulfilled" ? (firmsRes.value.hotspots ?? []) : [];
      const articles: { severity: string }[] =
        newsRes.status === "fulfilled" ? (newsRes.value.articles ?? []) : [];

      // Track whether we actually received flight data (vs rate-limited empty response)
      const rawFlights = flightsRes.status === "fulfilled" && Array.isArray(flightsRes.value)
        ? flightsRes.value : [];
      const flightsDataAvailable = flightsRes.status === "fulfilled" && rawFlights.length > 0;

      const airQuality =
        airQualityRes.status === "fulfilled" ? airQualityRes.value : { aqi: null, category: "Unknown" };
      const conflictEvents: ConflictPoint[] =
        conflictRes.status === "fulfilled" && Array.isArray(conflictRes.value.features)
          ? conflictRes.value.features.map((f) => ({
              ...f.properties,
              latitude: f.geometry.coordinates[1],
              longitude: f.geometry.coordinates[0],
            }))
          : [];

      setHotspots(thermalHotspots);

      // Compute airspace first so it feeds into the GSI score.
      // Pass flightsDataAvailable so the detector doesn't fire on empty/rate-limited responses.
      const airspaceStatus = checkAirspaceClosure(lat, lng, rawFlights, flightsDataAvailable);
      setAirspace(airspaceStatus);

      const result = calculateGSI(
        0, lat, lng,
        thermalHotspots, articles,
        airQuality.aqi ?? null,
        airQuality.category ?? "Unknown",
        conflictEvents,
        airspaceStatus.isClosed,
      );
      setGsi(result);
    } catch (err) {
      console.error("[RiskIntelligence]", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // Use primitive values so Zustand array reference changes don't matter
  }, [userLocation?.lat, userLocation?.lng, viewCountry, centerLat, centerLng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // When country changes, immediately trigger a recompute instead of
  // flashing the card to a loading skeleton. The stale score stays visible
  // with a loading indicator until fresh data arrives.
  const prevCountry = useRef(viewCountry);
  useEffect(() => {
    if (prevCountry.current !== viewCountry) {
      prevCountry.current = viewCountry;
      setLoading(true);
      // Bypass debounce so the new score arrives faster
      void compute();
    }
  }, [viewCountry, compute]);

  // Debounced recompute when map center or country changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void compute(); }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [compute]);

  // Polling
  useEffect(() => {
    timerRef.current = setInterval(() => void compute(), POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [compute]);

  // Manual refresh
  useEffect(() => {
    const handler = () => { void compute(); };
    window.addEventListener("saferoute:refresh", handler);
    return () => window.removeEventListener("saferoute:refresh", handler);
  }, [compute]);

  return { gsi, airspace, hotspots, loading };
}
