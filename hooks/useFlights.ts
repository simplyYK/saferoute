"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Flight } from "@/types/intelligence";
import { markMilitary } from "@/lib/flight-military";

const POLL_MS = 20_000;

async function fetchJsonArray(url: string): Promise<Flight[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data as Flight[];
  } catch {
    return [];
  }
}

function dedupeMerge(opensky: Flight[], adsb: Flight[]): Flight[] {
  const map = new Map<string, Flight>();

  for (const f of opensky) {
    const id = f.icao24.toLowerCase();
    map.set(id, { ...f });
  }

  for (const f of adsb) {
    const id = f.icao24.toLowerCase();
    const prev = map.get(id);
    if (!prev) {
      map.set(id, { ...f });
    } else {
      map.set(id, {
        ...prev,
        callsign: f.callsign ?? prev.callsign,
        altitude: f.altitude ?? prev.altitude,
        velocity: f.velocity ?? prev.velocity,
        heading: f.heading ?? prev.heading,
        onGround: f.onGround,
        category: f.category ?? prev.category,
        isMilitary: Boolean(prev.isMilitary || f.isMilitary),
      });
    }
  }

  return [...map.values()].map(markMilitary);
}

export function useFlights(enabled: boolean) {
  const [commercial, setCommercial] = useState<Flight[]>([]);
  const [military, setMilitary] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!enabled) {
      setCommercial([]);
      setMilitary([]);
      return;
    }
    setLoading(true);
    const [o, a] = await Promise.all([
      fetchJsonArray("/api/opensky"),
      fetchJsonArray("/api/adsb"),
    ]);
    if (!mounted.current) return;
    const merged = dedupeMerge(o, a);
    const mil = merged.filter((f) => f.isMilitary);
    const civ = merged.filter((f) => !f.isMilitary);
    setMilitary(mil);
    setCommercial(civ);
    setLastUpdated(new Date());
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCommercial([]);
      setMilitary([]);
      setLoading(false);
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  return { commercial, military, loading, lastUpdated, refresh: load };
}
