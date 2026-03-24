"use client";
import { useState } from "react";
import { MapPin, Navigation, Loader2, Route as RouteIcon } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useReports } from "@/hooks/useReports";
import { useConflictData } from "@/hooks/useConflictData";
import { calculateSafetyScore, safetyScoreColor, safetyScoreLabel } from "@/lib/utils/safety-score";
import { formatDistance, formatDuration } from "@/lib/utils/geo";
import type { RouteData } from "@/types/map";

interface Location {
  lat: number;
  lng: number;
  name: string;
}

export default function RoutePlanner() {
  const { setRoutes, setSelectedRoute, selectedRoute } = useMapStore();
  const { reports } = useReports();
  const { events } = useConflictData();

  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [destQuery, setDestQuery] = useState("");
  const [profile, setProfile] = useState<"foot" | "car" | "bike">("foot");
  const [loading, setLoading] = useState(false);
  const [routes, setLocalRoutes] = useState<RouteData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: "My Location" });
    });
  };

  const searchDestination = async () => {
    if (!destQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destQuery)}&format=json&limit=1`,
        { headers: { "User-Agent": "SafeRoute/1.0" } }
      );
      const data = await res.json();
      if (data[0]) {
        setDestination({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name,
        });
      }
    } catch { /* ignore */ }
  };

  const calculate = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/osrm?startLat=${origin.lat}&startLng=${origin.lng}&endLat=${destination.lat}&endLng=${destination.lng}&profile=${profile}&alternatives=true`
      );
      if (!res.ok) throw new Error("Route calculation failed");
      const data = await res.json();

      const scoredRoutes: RouteData[] = (data.routes || []).map((route: RouteData) => ({
        ...route,
        safetyScore: calculateSafetyScore(route.geometry.coordinates, events, reports),
      }));

      scoredRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
      setLocalRoutes(scoredRoutes);
      setRoutes(scoredRoutes);
      if (scoredRoutes.length > 0) setSelectedRoute(scoredRoutes[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to calculate route");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-navy text-white">
        <h2 className="font-semibold flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-teal" />
          Safe Route Planner
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Origin */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">From</label>
          <div className="flex gap-2">
            <div className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px] flex items-center">
              {origin ? (
                <span className="text-slate-700 truncate">{origin.name}</span>
              ) : (
                <span className="text-slate-400">Select origin...</span>
              )}
            </div>
            <button
              onClick={getMyLocation}
              className="bg-teal text-white p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Use my location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">To</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchDestination()}
              placeholder="Search destination..."
              className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal min-h-[44px]"
            />
            <button
              onClick={searchDestination}
              className="bg-slate-200 text-slate-700 p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>
          {destination && (
            <p className="text-xs text-green-600 mt-1 truncate">✓ {destination.name}</p>
          )}
        </div>

        {/* Profile */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Mode</label>
          <div className="flex gap-2">
            {(["foot", "car", "bike"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProfile(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors min-h-[44px] ${
                  profile === p ? "border-teal bg-teal/10 text-teal" : "border-slate-200 text-slate-600"
                }`}
              >
                {p === "foot" ? "🚶 Walk" : p === "car" ? "🚗 Drive" : "🚴 Bike"}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate */}
        <button
          onClick={calculate}
          disabled={!origin || !destination || loading}
          className="w-full bg-teal hover:bg-sky-400 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RouteIcon className="w-4 h-4" />}
          {loading ? "Calculating..." : "Find Safe Routes"}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Route results */}
        {routes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{routes.length} Routes Found</p>
            {routes.map((route, i) => (
              <button
                key={route.id}
                onClick={() => setSelectedRoute(route)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selectedRoute?.id === route.id ? "border-teal bg-teal/5" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">
                    {i === 0 ? "Safest" : i === routes.length - 1 ? "Fastest" : "Balanced"}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: safetyScoreColor(route.safetyScore) }}
                  >
                    {route.safetyScore}/100
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDistance(route.distanceKm)} · {formatDuration(route.durationMinutes)} · {safetyScoreLabel(route.safetyScore)}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Steps */}
        {selectedRoute?.steps.length ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Directions</p>
            {selectedRoute.steps.slice(0, 10).map((step, i) => (
              <div key={i} className="flex gap-2 text-xs text-slate-700 py-1 border-b border-slate-100">
                <span className="shrink-0 text-slate-400">{i + 1}.</span>
                <span>{step.instruction}</span>
                <span className="ml-auto shrink-0 text-slate-400">{formatDistance(step.distance / 1000)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
