"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ThermalHotspot } from "@/lib/risk-intelligence";
import { useMapStore } from "@/store/mapStore";

const POLL_MS = 5 * 60_000; // 5 min

export function useFirmsHotspots(enabled = true) {
  const bounds = useMapStore((s) => s.bounds);
  const [hotspots, setHotspots] = useState<ThermalHotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    if (!enabled || !bounds) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/firms?south=${bounds.south}&north=${bounds.north}&west=${bounds.west}&east=${bounds.east}`
      );
      if (!res.ok || cancelledRef.current) return;
      const data = (await res.json()) as { hotspots?: ThermalHotspot[] };
      if (!cancelledRef.current) setHotspots(data.hotspots ?? []);
    } catch {
      /* ignore */
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [enabled, bounds]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!enabled || !bounds) return;
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [enabled, bounds, load]);

  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener("saferoute:refresh", handler);
    return () => window.removeEventListener("saferoute:refresh", handler);
  }, [load]);

  return { hotspots, loading };
}
