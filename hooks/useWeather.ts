"use client";
import { useState, useEffect } from "react";
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

export function useWeather() {
  const center = useMapStore((s) => s.center);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const [lat, lng] = center;

    async function fetchWeather() {
      try {
        setLoading(true);
        const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setWeather(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load weather");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    return () => { cancelled = true; };
  }, [center]);

  return { weather, loading, error };
}
