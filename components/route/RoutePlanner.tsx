"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation, Loader2, Route as RouteIcon, Bot, AlertTriangle, ChevronDown, ChevronUp, Footprints, Car, Bike, Play } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useReports } from "@/hooks/useReports";
import { useConflictData } from "@/hooks/useConflictData";
import { calculateSafetyScore, safetyScoreColor, safetyScoreLabel, countReportsAlongRoute } from "@/lib/utils/safety-score";
import { formatDistance, formatDuration } from "@/lib/utils/geo";
import LocationSearch, { type LocationResult } from "@/components/shared/LocationSearch";
import type { RouteData, ElevationStats } from "@/types/map";

interface RoutePlannerProps {
  onStartNavigation?: () => void;
}

export default function RoutePlanner({ onStartNavigation }: RoutePlannerProps = {}) {
  const params = useSearchParams();
  const { setRoutes, setSelectedRoute, selectedRoute, flyTo } = useMapStore();
  const { reports } = useReports();
  const { events } = useConflictData();

  const [origin, setOrigin] = useState<LocationResult | null>(null);
  const [destination, setDestination] = useState<LocationResult | null>(null);
  const [profile, setProfile] = useState<"foot" | "car" | "bike">("foot");
  const [loading, setLoading] = useState(false);
  const [routes, setLocalRoutes] = useState<RouteData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [pickingFor, setPickingFor] = useState<"origin" | "destination" | null>(null);

  const routePinDrop = useMapStore((s) => s.routePinDrop);
  const setRoutePinDrop = useMapStore((s) => s.setRoutePinDrop);

  const autoCalcRef = useRef(false);

  // Listen for map click pin drops
  useEffect(() => {
    if (!routePinDrop || !pickingFor) return;
    const loc: LocationResult = {
      lat: routePinDrop.lat,
      lng: routePinDrop.lng,
      name: `${routePinDrop.lat.toFixed(4)}, ${routePinDrop.lng.toFixed(4)}`,
    };
    if (pickingFor === "origin") {
      setOrigin(loc);
      flyTo([loc.lat, loc.lng]);
    } else {
      setDestination(loc);
      flyTo([loc.lat, loc.lng]);
    }
    setPickingFor(null);
    setRoutePinDrop(null);
  }, [routePinDrop, pickingFor, flyTo, setRoutePinDrop]);

  // Pre-fill origin from URL params (e.g. from ActionGrid "Go Safely")
  useEffect(() => {
    const oLat = params.get("originLat");
    const oLng = params.get("originLng");
    const oName = params.get("originName");
    const dLat = params.get("destLat");
    const dLng = params.get("destLng");
    const dName = params.get("destName");
    if (oLat && oLng) {
      setOrigin({ lat: parseFloat(oLat), lng: parseFloat(oLng), name: oName ?? "My Location" });
    }
    if (dLat && dLng) {
      setDestination({ lat: parseFloat(dLat), lng: parseFloat(dLng), name: decodeURIComponent(dName ?? "Destination") });
      autoCalcRef.current = !!(oLat && oLng);
    }
  }, [params]);

  // Pick up agent-initiated route from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("agentRoute");
    if (stored) {
      sessionStorage.removeItem("agentRoute");
      try {
        const data = JSON.parse(stored) as { origin: LocationResult; destination: LocationResult; profile?: string };
        setOrigin(data.origin);
        setDestination(data.destination);
        if (data.profile === "car" || data.profile === "bike" || data.profile === "foot") {
          setProfile(data.profile);
        }
        autoCalcRef.current = true;
      } catch { /* ignore */ }
    }
  }, []);

  // Auto-calculate when agent pre-filled both origin and destination
  useEffect(() => {
    if (autoCalcRef.current && origin && destination && !loading) {
      autoCalcRef.current = false;
      calculate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination]);

  const getMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const loc: LocationResult = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name: "My Location",
      };
      setOrigin(loc);
      flyTo([loc.lat, loc.lng]);
    });
  };

  const handleOriginSelect = (r: LocationResult) => {
    setOrigin(r);
    flyTo([r.lat, r.lng]);
  };

  const handleDestinationSelect = (r: LocationResult) => {
    setDestination(r);
    flyTo([r.lat, r.lng]);
  };

  const calculate = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    setLocalRoutes([]);

    try {
      const res = await fetch(
        `/api/osrm?startLat=${origin.lat}&startLng=${origin.lng}&endLat=${destination.lat}&endLng=${destination.lng}&profile=${profile}&alternatives=true`
      );
      if (!res.ok) throw new Error("Route calculation failed");
      const data = await res.json() as { routes?: RouteData[] };

      const scored: RouteData[] = (data.routes ?? []).map((r) => ({
        ...r,
        safetyScore: calculateSafetyScore(r.geometry.coordinates, events, reports),
      }));
      scored.sort((a, b) => b.safetyScore - a.safetyScore);

      setLocalRoutes(scored);
      setRoutes(scored);
      if (scored.length > 0) setSelectedRoute(scored[0]);

      // Fetch elevation for each route in background
      for (const route of scored) {
        const coords = route.geometry.coordinates;
        const sampleRate = Math.max(1, Math.floor(coords.length / 30));
        const sampled = coords.filter((_, i) => i % sampleRate === 0);
        // coords are [lng, lat], elevation API needs lat,lng
        const path = sampled.map(([lng, lat]) => [lat, lng] as [number, number]);
        fetch("/api/google-elevation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, samples: Math.min(path.length, 50) }),
        })
          .then((r) => r.json())
          .then((d: { stats?: ElevationStats }) => {
            if (d.stats) {
              const withElev = { ...route, elevationStats: d.stats };
              setLocalRoutes((prev) => prev.map((r) => (r.id === route.id ? withElev : r)));
              const currentRoutes = useMapStore.getState().routes;
              setRoutes(currentRoutes.map((r) => (r.id === route.id ? withElev : r)));
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to calculate route");
    } finally {
      setLoading(false);
    }
  };

  const modeIcons = { foot: Footprints, car: Car, bike: Bike };
  const modeLabels = { foot: "Walk", car: "Drive", bike: "Cycle" };

  const routeReports = selectedRoute
    ? countReportsAlongRoute(selectedRoute.geometry.coordinates, reports)
    : { count: 0, criticalCount: 0 };

  return (
    <div className="flex flex-col h-full bg-[#0d1424]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2 text-sm text-white">
          <RouteIcon className="w-4 h-4 text-teal" />
          Safe Route Planner
        </h2>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("sentinel:open-ai", { detail: "Help me plan a safe route. What are the threats I should avoid?" }))}
          className="flex items-center gap-1.5 text-xs text-teal hover:text-white border border-teal/30 hover:border-white/30 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <Bot className="w-3.5 h-3.5" />
          Ask AI
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Pin-drop hint */}
        {pickingFor && (
          <div className="bg-teal/10 border border-teal/30 rounded-xl px-3 py-2 text-xs text-teal font-medium text-center animate-pulse">
            Tap anywhere on the map to set your {pickingFor === "origin" ? "starting point" : "destination"}
          </div>
        )}

        {/* Origin */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">From</label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              {origin ? (
                <div className="flex items-center gap-2 border border-teal/60 rounded-xl px-3 py-2 min-h-[44px] bg-teal/8">
                  <span className="text-sm text-white truncate flex-1">{origin.name}</span>
                  <button onClick={() => setOrigin(null)} className="text-slate-500 hover:text-white shrink-0 transition-colors">✕</button>
                </div>
              ) : (
                <div onClick={() => setPickingFor("origin")}>
                  <LocationSearch
                    placeholder="Search or tap map..."
                    onSelect={handleOriginSelect}
                    className="min-h-[44px]"
                    dark
                  />
                </div>
              )}
            </div>
            <button
              onClick={getMyLocation}
              title="Use my GPS location"
              className="bg-teal text-white p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-sky-500 transition-colors shrink-0"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">To</label>
          {destination ? (
            <div className="flex items-center gap-2 border border-teal/60 rounded-xl px-3 py-2 min-h-[44px] bg-teal/8">
              <span className="text-sm text-white truncate flex-1">{destination.name}</span>
              <button onClick={() => setDestination(null)} className="text-slate-500 hover:text-white shrink-0 transition-colors">✕</button>
            </div>
          ) : (
            <div onClick={() => setPickingFor("destination")}>
            <LocationSearch
              placeholder="Search or tap map..."
              onSelect={handleDestinationSelect}
              className="min-h-[44px]"
              dark
            />
            </div>
          )}
        </div>

        {/* Transport mode */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {(["foot", "car", "bike"] as const).map((p) => {
              const Icon = modeIcons[p];
              return (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl border-2 transition-all min-h-[56px] gap-1 ${
                    profile === p
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{modeLabels[p]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calculate button */}
        <button
          onClick={calculate}
          disabled={!origin || !destination || loading}
          className="w-full bg-teal hover:bg-sky-500 disabled:opacity-40 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 min-h-[48px] transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RouteIcon className="w-4 h-4" />}
          {loading ? "Calculating safe routes…" : "Find Safe Routes"}
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Route results */}
        {routes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {routes.length} Route{routes.length > 1 ? "s" : ""} Found
            </p>
            {routes.map((route, i) => {
              const isSelected = selectedRoute?.id === route.id;
              const color = safetyScoreColor(route.safetyScore);
              const badge = i === 0 ? "Recommended" : i === routes.length - 1 ? "Fastest" : "Alternative";
              return (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    isSelected ? "border-teal bg-teal/10 shadow-sm" : "border-white/10 bg-white/4 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i === 0 ? "bg-green-500/20 text-green-400" : "bg-white/10 text-slate-300"}`}>
                        {badge}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-bold"
                      style={{ background: color }}
                    >
                      <span>{route.safetyScore}/100</span>
                      <span className="opacity-80">·</span>
                      <span>{safetyScoreLabel(route.safetyScore)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">
                    {formatDistance(route.distanceKm)} · {formatDuration(route.durationMinutes)}
                    {route.elevationStats && (
                      <span className="text-slate-400 ml-1">
                        · ↑{route.elevationStats.gain}m ↓{route.elevationStats.loss}m
                      </span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Route report warnings */}
        {selectedRoute && routeReports.count >= 8 && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <p><strong>DANGER:</strong> {routeReports.count} incident reports along this route.</p>
              {routes.length > 1 && (
                <button
                  onClick={() => setSelectedRoute(routes.find((r) => r.id !== selectedRoute.id) ?? selectedRoute)}
                  className="mt-1 text-xs text-red-400 font-semibold underline"
                >
                  Try safer alternative →
                </button>
              )}
            </div>
          </div>
        )}
        {selectedRoute && routeReports.count >= 5 && routeReports.count < 8 && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-sm text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span><strong>CAUTION:</strong> {routeReports.count} community reports along this route. Consider alternatives.</span>
          </div>
        )}
        {selectedRoute && routeReports.count > 0 && routeReports.count < 5 && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-sm text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span><strong>{routeReports.count} community report{routeReports.count > 1 ? "s" : ""}</strong> near this route. Proceed with caution.</span>
          </div>
        )}

        {/* Step-by-step directions */}
        {/* Start Navigation button */}
        {selectedRoute && onStartNavigation && (
          <button
            onClick={onStartNavigation}
            className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Navigation
          </button>
        )}

        {selectedRoute?.steps.length ? (
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setStepsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/8 transition-colors"
            >
              <span>Step-by-step directions ({selectedRoute.steps.length} steps)</span>
              {stepsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {stepsOpen && (
              <div className="divide-y divide-slate-100">
                {selectedRoute.steps.map((step, i) => (
                  <div key={i} className="flex gap-2.5 px-3 py-2 text-xs text-slate-300 border-b border-white/5 last:border-0">
                    <span className="shrink-0 w-4 text-slate-400 font-medium">{i + 1}.</span>
                    <span className="flex-1">{step.instruction}</span>
                    <span className="shrink-0 text-slate-400 ml-2">{formatDistance(step.distance / 1000)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
