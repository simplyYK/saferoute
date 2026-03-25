"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation, Loader2, Route as RouteIcon, Bot, AlertTriangle, ChevronDown, ChevronUp, Footprints, Car, Bike } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useReports } from "@/hooks/useReports";
import { useConflictData } from "@/hooks/useConflictData";
import { calculateSafetyScore, safetyScoreColor, safetyScoreLabel } from "@/lib/utils/safety-score";
import { formatDistance, formatDuration } from "@/lib/utils/geo";
import LocationSearch, { type LocationResult } from "@/components/shared/LocationSearch";
import type { RouteData } from "@/types/map";

export default function RoutePlanner() {
  const router = useRouter();
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to calculate route");
    } finally {
      setLoading(false);
    }
  };

  const modeIcons = { foot: Footprints, car: Car, bike: Bike };
  const modeLabels = { foot: "Walk", car: "Drive", bike: "Cycle" };

  const nearbyHazards = selectedRoute
    ? reports.filter((r) => {
        const coords = selectedRoute.geometry.coordinates;
        return coords.some(([lng, lat]) => {
          const d = Math.sqrt((lat - r.latitude) ** 2 + (lng - r.longitude) ** 2);
          return d < 0.05;
        });
      }).length
    : 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-navy text-white flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <RouteIcon className="w-4 h-4 text-teal" />
          Safe Route Planner
        </h2>
        <button
          type="button"
          onClick={() => router.push("/assistant")}
          className="flex items-center gap-1.5 text-xs text-teal hover:text-white border border-teal/40 hover:border-white/40 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <Bot className="w-3.5 h-3.5" />
          Ask AI
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Origin */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              {origin ? (
                <div className="flex items-center gap-2 border-2 border-teal rounded-lg px-3 py-2 min-h-[44px] bg-teal/5">
                  <span className="text-sm text-slate-700 truncate flex-1">{origin.name}</span>
                  <button onClick={() => setOrigin(null)} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">✕</button>
                </div>
              ) : (
                <LocationSearch
                  placeholder="Search origin..."
                  onSelect={handleOriginSelect}
                  className="min-h-[44px]"
                />
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
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          {destination ? (
            <div className="flex items-center gap-2 border-2 border-teal rounded-lg px-3 py-2 min-h-[44px] bg-teal/5">
              <span className="text-sm text-slate-700 truncate flex-1">{destination.name}</span>
              <button onClick={() => setDestination(null)} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">✕</button>
            </div>
          ) : (
            <LocationSearch
              placeholder="Search destination..."
              onSelect={handleDestinationSelect}
              className="min-h-[44px]"
            />
          )}
        </div>

        {/* Transport mode */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Mode</label>
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
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Route results */}
        {routes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {routes.length} Route{routes.length > 1 ? "s" : ""} Found
            </p>
            {routes.map((route, i) => {
              const isSelected = selectedRoute?.id === route.id;
              const color = safetyScoreColor(route.safetyScore);
              const badge = i === 0 ? "Safest" : i === routes.length - 1 ? "Fastest" : "Balanced";
              return (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    isSelected ? "border-teal bg-teal/5 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i === 0 ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
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
                  <p className="text-sm text-slate-600">
                    {formatDistance(route.distanceKm)} · {formatDuration(route.durationMinutes)}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Hazard warning */}
        {selectedRoute && nearbyHazards > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span><strong>{nearbyHazards} community report{nearbyHazards > 1 ? "s" : ""}</strong> near this route. Proceed with caution.</span>
          </div>
        )}

        {/* Step-by-step directions */}
        {selectedRoute?.steps.length ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setStepsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span>Step-by-step directions ({selectedRoute.steps.length} steps)</span>
              {stepsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {stepsOpen && (
              <div className="divide-y divide-slate-100">
                {selectedRoute.steps.map((step, i) => (
                  <div key={i} className="flex gap-2.5 px-3 py-2 text-xs text-slate-700">
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
