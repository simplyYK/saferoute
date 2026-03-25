"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import {
  calculateGSI,
  checkAirspaceClosure,
  obfuscateCoord,
  type GSIResult,
  type AirspaceStatus,
  type ThermalHotspot,
} from "@/lib/risk-intelligence";

const POLL_MS = 60_000; // refresh every 60 s

export interface RiskIntelligenceState {
  gsi: GSIResult | null;
  airspace: AirspaceStatus | null;
  hotspots: ThermalHotspot[];
  loading: boolean;
}

export function useRiskIntelligence(): RiskIntelligenceState {
  const userLocation = useAppStore((s) => s.userLocation);
  const [gsi, setGsi] = useState<GSIResult | null>(null);
  const [airspace, setAirspace] = useState<AirspaceStatus | null>(null);
  const [hotspots, setHotspots] = useState<ThermalHotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const compute = useCallback(async () => {
    if (!userLocation) return;
    setLoading(true);

    const lat = userLocation.lat;
    const lng = userLocation.lng;
    // Obfuscated coords for external APIs (privacy)
    const oLat = obfuscateCoord(lat);
    const oLng = obfuscateCoord(lng);
    const radius = 0.05; // ~5 km in degrees

    try {
      // Fetch all three data sources in parallel
      const [shelterRes, firmsRes, newsRes, flightsRes] = await Promise.allSettled([
        // 1. Shelter density from Overpass
        fetch(
          `/api/overpass?type=shelter&south=${oLat - radius}&north=${oLat + radius}&west=${oLng - radius}&east=${oLng + radius}`
        ).then((r) => r.json()) as Promise<{ count?: number }>,

        // 2. NASA FIRMS thermal hotspots
        fetch(
          `/api/firms?south=${oLat - radius}&north=${oLat + radius}&west=${oLng - radius}&east=${oLng + radius}`
        ).then((r) => r.json()) as Promise<{
          hotspots?: ThermalHotspot[];
        }>,

        // 3. News sentiment (GDELT/RSS)
        fetch(`/api/gdelt`).then((r) => r.json()) as Promise<{
          articles?: { severity: string }[];
        }>,

        // 4. Flight data (for Dead-Drop airspace check)
        fetch(`/api/opensky`).then((r) => r.json()) as Promise<
          { lat: number; lng: number; onGround: boolean }[]
        >,
      ]);

      const shelterCount =
        shelterRes.status === "fulfilled"
          ? (shelterRes.value as { count?: number }).count ?? 0
          : 0;
      const thermalHotspots: ThermalHotspot[] =
        firmsRes.status === "fulfilled"
          ? ((firmsRes.value as { hotspots?: ThermalHotspot[] }).hotspots ?? [])
          : [];
      const articles =
        newsRes.status === "fulfilled"
          ? ((newsRes.value as { articles?: { severity: string }[] }).articles ?? [])
          : [];
      const flights =
        flightsRes.status === "fulfilled"
          ? Array.isArray(flightsRes.value)
            ? (flightsRes.value as { lat: number; lng: number; onGround: boolean }[])
            : []
          : [];

      setHotspots(thermalHotspots);

      // Compute GSI
      const result = calculateGSI(shelterCount, lat, lng, thermalHotspots, articles);
      setGsi(result);

      // Check airspace closure (Dead-Drop)
      const airStatus = checkAirspaceClosure(lat, lng, flights);
      setAirspace(airStatus);
    } catch (err) {
      console.error("[RiskIntelligence]", err);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    void compute();
    timerRef.current = setInterval(() => void compute(), POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [compute]);

  return { gsi, airspace, hotspots, loading };
}
