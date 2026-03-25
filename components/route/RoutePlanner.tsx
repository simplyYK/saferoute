"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Loader2, Route as RouteIcon } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useReports } from "@/hooks/useReports";
import { useConflictData } from "@/hooks/useConflictData";
import {
  calculateSafetyScore,
  safetyScoreColor,
  safetyScoreLabel,
} from "@/lib/utils/safety-score";
import { formatDistance, formatDuration } from "@/lib/utils/geo";
import type { RouteData } from "@/types/map";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = { "User-Agent": "SafeRoute/1.0 (crisis navigation; +https://github.com/simplyYK/saferoute)" };

export type InitialPlace = { lat: number; lng: number; name: string };

function maneuverGlyph(step: RouteData["steps"][0]): string {
  const t = step.maneuver?.type || "";
  const mod = (step.maneuver?.modifier || "").toLowerCase();
  if (t === "roundabout" || t === "rotary" || t === "roundabout turn") return "↻";
  if (mod.includes("left")) return "←";
  if (mod.includes("right")) return "→";
  if (mod.includes("straight") || t === "continue" || t === "new name") return "↑";
  if (t === "arrive") return "◎";
  return "🔄";
}

type NominatimHit = { lat: string; lon: string; display_name: string };

interface Location {
  lat: number;
  lng: number;
  name: string;
}

type Profile = "foot" | "car" | "bike";

interface RoutePlannerProps {
  initialDestination?: InitialPlace | null;
}

export default function RoutePlanner({ initialDestination }: RoutePlannerProps) {
  const { setRoutes, setSelectedRoute, selectedRoute } = useMapStore();
  const { reports } = useReports();
  const { events } = useConflictData();

  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);

  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromHits, setFromHits] = useState<NominatimHit[]>([]);
  const [toHits, setToHits] = useState<NominatimHit[]>([]);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const [profile, setProfile] = useState<Profile>("foot");
  const [loading, setLoading] = useState(false);
  const [routes, setLocalRoutes] = useState<RouteData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debounceFrom = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialDestination) {
      setDestination(initialDestination);
      setToQuery(initialDestination.name);
    }
  }, [initialDestination]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: UA }
      );
      if (!res.ok) return null;
      const j = (await res.json()) as { display_name?: string };
      return j.display_name || null;
    } catch {
      return null;
    }
  }, []);

  const searchNominatim = useCallback(async (q: string): Promise<NominatimHit[]> => {
    if (!q.trim()) return [];
    const res = await fetch(
      `${NOMINATIM}/search?q=${encodeURIComponent(q.trim())}&format=json&limit=5`,
      { headers: UA }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimHit[];
    return Array.isArray(data) ? data : [];
  }, []);

  const scheduleFromSearch = (q: string) => {
    setFromQuery(q);
    if (debounceFrom.current) clearTimeout(debounceFrom.current);
    debounceFrom.current = setTimeout(async () => {
      const hits = await searchNominatim(q);
      setFromHits(hits);
      setFromOpen(true);
    }, 350);
  };

  const scheduleToSearch = (q: string) => {
    setToQuery(q);
    if (debounceTo.current) clearTimeout(debounceTo.current);
    debounceTo.current = setTimeout(async () => {
      const hits = await searchNominatim(q);
      setToHits(hits);
      setToOpen(true);
    }, 350);
  };

  const pickFrom = (h: NominatimHit) => {
    setOrigin({
      lat: parseFloat(h.lat),
      lng: parseFloat(h.lon),
      name: h.display_name,
    });
    setFromQuery(h.display_name.split(",").slice(0, 2).join(", "));
    setFromOpen(false);
  };

  const pickTo = (h: NominatimHit) => {
    setDestination({
      lat: parseFloat(h.lat),
      lng: parseFloat(h.lon),
      name: h.display_name,
    });
    setToQuery(h.display_name.split(",").slice(0, 2).join(", "));
    setToOpen(false);
  };

  const getMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const name = (await reverseGeocode(lat, lng)) || "My location";
        setOrigin({ lat, lng, name });
        setFromQuery(name.split(",").slice(0, 2).join(", "));
        setFromOpen(false);
      },
      () => setError("Could not read your location. Allow GPS or type a “From” place.")
    );
  };

  const calculate = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/osrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromLat: origin.lat,
          fromLng: origin.lng,
          toLat: destination.lat,
          toLng: destination.lng,
          mode: profile,
          alternatives: true,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Route calculation failed");
      }
      const data = (await res.json()) as { routes?: RouteData[] };
      const raw = Array.isArray(data.routes) ? data.routes : [];

      const scored: RouteData[] = raw.map((route) => ({
        ...route,
        safetyScore: calculateSafetyScore(route.geometry.coordinates, events, reports),
      }));

      scored.sort((a, b) => b.safetyScore - a.safetyScore);
      const top = scored.slice(0, 3);

      setLocalRoutes(top);
      setRoutes(top);
      if (top.length > 0) setSelectedRoute(top[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to calculate route");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b bg-navy text-white shrink-0">
        <h2 className="font-semibold flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-teal" />
          Safe Route Planner
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* From */}
        <div className="relative">
          <label className="text-xs font-semibold text-slate-600 block mb-1">From</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={fromQuery}
                onChange={(e) => scheduleFromSearch(e.target.value)}
                onFocus={() => fromHits.length && setFromOpen(true)}
                onBlur={() => setTimeout(() => setFromOpen(false), 200)}
                placeholder="Search start or use GPS…"
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal min-h-[44px]"
              />
              {fromOpen && fromHits.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
                  {fromHits.map((h, i) => (
                    <li key={`${h.lat}-${h.lon}-${i}`}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickFrom(h)}
                      >
                        {h.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={getMyLocation}
              className="bg-teal text-white p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              title="Use my location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
          {origin && (
            <p className="text-xs text-green-600 mt-1 truncate">✓ {origin.name}</p>
          )}
        </div>

        {/* To */}
        <div className="relative">
          <label className="text-xs font-semibold text-slate-600 block mb-1">To</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={toQuery}
                onChange={(e) => scheduleToSearch(e.target.value)}
                onFocus={() => toHits.length && setToOpen(true)}
                onBlur={() => setTimeout(() => setToOpen(false), 200)}
                onKeyDown={(e) => e.key === "Enter" && toHits[0] && pickTo(toHits[0])}
                placeholder="Search destination…"
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal min-h-[44px]"
              />
              {toOpen && toHits.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
                  {toHits.map((h, i) => (
                    <li key={`${h.lat}-${h.lon}-${i}-t`}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickTo(h)}
                      >
                        {h.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                void searchNominatim(toQuery).then((hits) => hits[0] && pickTo(hits[0]))
              }
              className="bg-slate-200 text-slate-700 p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              title="Search"
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>
          {destination && (
            <p className="text-xs text-green-600 mt-1 truncate">✓ {destination.name}</p>
          )}
        </div>

        {/* Mode */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Mode</label>
          <div className="flex gap-2">
            {(
              [
                ["foot", "🚶 Walking"],
                ["car", "🚗 Car"],
                ["bike", "🚲 Bike"],
              ] as const
            ).map(([p, label]) => (
              <button
                key={p}
                type="button"
                onClick={() => setProfile(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors min-h-[44px] ${
                  profile === p
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void calculate()}
          disabled={!origin || !destination || loading}
          className="w-full bg-teal hover:bg-sky-400 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RouteIcon className="w-4 h-4" />}
          {loading ? "Calculating…" : "Find safe routes"}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}

        {routes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Top routes (by safety)
            </p>
            {routes.map((route, i) => {
              const pct = Math.max(0, Math.min(100, route.safetyScore));
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setSelectedRoute(route)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    selectedRoute?.id === route.id
                      ? "border-teal bg-teal/5"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm">
                      {i === 0 ? "Safest option" : `Alternative ${i + 1}`}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ background: safetyScoreColor(route.safetyScore) }}
                    >
                      {route.safetyScore}/100
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-slate-200 overflow-hidden mb-2"
                    title="Safety score"
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: safetyScoreColor(route.safetyScore),
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDistance(route.distanceKm)} · {formatDuration(route.durationMinutes)} ·{" "}
                    {safetyScoreLabel(route.safetyScore)} · {route.steps.length} steps
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {selectedRoute && selectedRoute.steps.length > 0 && (
          <div className="space-y-2 pb-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Turn-by-turn
            </p>
            <ul className="space-y-2">
              {selectedRoute.steps.map((step, i) => (
                <li
                  key={`${selectedRoute.id}-step-${i}`}
                  className="flex gap-2 text-xs text-slate-800 py-2 border-b border-slate-100"
                >
                  <span className="shrink-0 w-6 text-center font-mono text-slate-500">
                    {maneuverGlyph(step)}
                  </span>
                  <span className="flex-1">
                    {step.instruction}
                    <span className="text-slate-400"> · {formatDistance(step.distance / 1000)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
