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
    // Use GPS if available, otherwise map center
    const lat = userLocation?.lat ?? centerLat;
    const lng = userLocation?.lng ?? centerLng;
    if (lat === 0 && lng === 0) return;
    setLoading(true);
    const oLat = obfuscateCoord(lat);
    const oLng = obfuscateCoord(lng);
    const radius = 0.05;

    try {
      const [firmsRes, newsRes, flightsRes, airQualityRes, conflictRes] = await Promise.allSettled([
        fetch(`/api/firms?south=${oLat - radius}&north=${oLat + radius}&west=${oLng - radius}&east=${oLng + radius}`)
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
      const flights: { lat: number; lng: number; onGround: boolean }[] =
        flightsRes.status === "fulfilled" && Array.isArray(flightsRes.value) ? flightsRes.value : [];
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

      const result = calculateGSI(
        0, lat, lng,
        thermalHotspots, articles,
        airQuality.aqi ?? null,
        airQuality.category ?? "Unknown",
        conflictEvents,
      );
      setGsi(result);
      setAirspace(checkAirspaceClosure(lat, lng, flights));
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

  // Reset GSI when country changes
  const prevCountry = useRef(viewCountry);
  useEffect(() => {
    if (prevCountry.current !== viewCountry) {
      prevCountry.current = viewCountry;
      setGsi(null);
      setAirspace(null);
    }
  }, [viewCountry]);

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
