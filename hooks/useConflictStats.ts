"use client";
import { useState, useEffect, useRef } from "react";

export interface ConflictStats {
  country: string;
  iso3: string;
  source: string;
  summary: {
    totalEvents12m: number;
    totalFatalities12m: number;
    latestMonth: { month: string; events: number; fatalities: number } | null;
    latestCompleteMonth: { month: string; events: number; fatalities: number } | null;
    trend: { direction: string; percentChange: number } | null;
    monthlyData: Array<{ month: string; events: number; fatalities: number }>;
  };
  topRegions: Array<{
    name: string;
    events: number;
    fatalities: number;
    types: string[];
  }>;
}

// Client-side cache
const statsCache = new Map<string, { data: ConflictStats; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export function useConflictStats(country: string) {
  const [stats, setStats] = useState<ConflictStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountRef = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    if (!country || country === "My Location") {
      setStats(null);
      setLoading(false);
      return;
    }

    // Check cache
    const cached = statsCache.get(country);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setStats(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/conflict-stats?country=${encodeURIComponent(country)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mountRef.current) return;
        if (data.error) {
          setError(data.error);
          setStats(null);
        } else {
          statsCache.set(country, { data, ts: Date.now() });
          setStats(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (mountRef.current) setError(e.message);
      })
      .finally(() => {
        if (mountRef.current) setLoading(false);
      });

    return () => { mountRef.current = false; };
  }, [country]);

  return { stats, loading, error };
}
