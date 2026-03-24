"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SeismicEvent } from "@/types/intelligence";

const POLL_MS = 60_000;

export function useSeismic(enabled: boolean) {
  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!enabled) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/seismic");
      const data = (await res.json()) as unknown;
      if (!mounted.current) return;
      setEvents(Array.isArray(data) ? (data as SeismicEvent[]) : []);
    } catch {
      if (mounted.current) setEvents([]);
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
      setEvents([]);
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  return { events, loading, refresh: load };
}
