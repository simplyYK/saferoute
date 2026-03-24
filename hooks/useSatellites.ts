"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SatelliteTrack } from "@/types/intelligence";

const POLL_MS = 5 * 60_000;

export function useSatellites(enabled: boolean) {
  const [satellites, setSatellites] = useState<SatelliteTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!enabled) {
      setSatellites([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/satellites");
      const data = (await res.json()) as unknown;
      if (!mounted.current) return;
      setSatellites(Array.isArray(data) ? (data as SatelliteTrack[]) : []);
    } catch {
      if (mounted.current) setSatellites([]);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSatellites([]);
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  return { satellites, loading, refresh: load };
}
