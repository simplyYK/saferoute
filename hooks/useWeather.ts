"use client";
import { useState, useEffect, useRef } from "react";
import { useMapStore } from "@/store/mapStore";

export interface WeatherData {
  temperature: number;
  windSpeed: number;
  rain: number;
  weatherCode: number;
  visibility: number;
  condition: string;
  units: {
    temperature: string;
    windSpeed: string;
    rain: string;
    visibility: string;
  };
}

// Client-side cache: "lat,lng" -> { data, timestamp }
const weatherCache = new Map<string, { data: WeatherData; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useWeather() {
  const center = useMapStore((s) => s.center);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountRef = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    const [lat, lng] = center;
    // Round to 1 decimal for cache key (avoid cache misses on tiny map pans)
    const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;

    // Check cache
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setWeather(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    async function fetchWeather() {
      try {
        setLoading(true);
        const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mountRef.current) return;
        weatherCache.set(key, { data, ts: Date.now() });
        setWeather(data);
        setError(null);
      } catch (e) {
        if (!mountRef.current) return;
        setError(e instanceof Error ? e.message : "Failed to load weather");
      } finally {
        if (mountRef.current) setLoading(false);
      }
    }

    fetchWeather();
    return () => { mountRef.current = false; };
  }, [center]);

  return { weather, loading, error };
}
