"use client";
import { useState, useEffect } from "react";
import type { ThermalHotspot } from "@/lib/risk-intelligence";
import { useMapStore } from "@/store/mapStore";

const POLL_MS = 5 * 60_000; // 5 min

export function useFirmsHotspots(enabled = true) {
  const bounds = useMapStore((s) => s.bounds);
  const [hotspots, setHotspots] = useState<ThermalHotspot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !bounds) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/firms?south=${bounds.south}&north=${bounds.north}&west=${bounds.west}&east=${bounds.east}`
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { hotspots?: ThermalHotspot[] };
        if (!cancelled) setHotspots(data.hotspots ?? []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, bounds]);

  return { hotspots, loading };
}
