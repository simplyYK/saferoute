"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, Navigation, X, Clock, Route, Bot, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import { useReports } from "@/hooks/useReports";
import { useConflictData } from "@/hooks/useConflictData";
import { calculateSafetyScore, safetyScoreColor, safetyScoreLabel } from "@/lib/utils/safety-score";
import { formatDistance, formatDuration } from "@/lib/utils/geo";
import type { RouteData } from "@/types/map";

interface ShelterResult {
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  route?: RouteData;
}

interface GetToSafetyButtonProps {
  onOpenAI?: (prompt?: string) => void;
}

// Shelter-type places we search for via Google Places Nearby API
// These are places that can realistically serve as emergency shelter
const SHELTER_SEARCHES = [
  { type: "hospital", label: "Hospital" },
  { type: "shelter", label: "Shelter" },
  { type: "fire_station", label: "Fire Station" },
];

// Fallback Overpass types (if Google API unavailable)
const OVERPASS_SHELTER_TYPES = ["shelter", "hospital", "community_centre", "place_of_worship", "fire_station"];

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GetToSafetyButton({ onOpenAI }: GetToSafetyButtonProps) {
  const userLocation = useAppStore((s) => s.userLocation);
  const { setRoutes, setSelectedRoute, flyTo } = useMapStore();
  const { reports } = useReports();
  const viewCountry = useMapStore((s) => s.viewCountry);
  const { events } = useConflictData(viewCountry);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShelterResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handlePress = async () => {
    if (!userLocation) {
      setError("Enable location access first");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Strategy: Try Google Places first (better data), fallback to Overpass
      let allShelters: { name: string; lat: number; lng: number }[] = [];

      // Attempt 1: Google Places Nearby — search multiple shelter-relevant types in parallel
      try {
        const googleResults = await Promise.all(
          SHELTER_SEARCHES.map(async ({ type }) => {
            const res = await fetch("/api/google-places", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat: userLocation.lat,
                lng: userLocation.lng,
                type,
                radius: 10000, // 10km radius
              }),
            });
            if (!res.ok) return [];
            const data = await res.json() as {
              resources?: { name?: string; latitude: number; longitude: number }[];
            };
            return (data.resources ?? []).map((r) => ({
              name: r.name ?? type,
              lat: r.latitude,
              lng: r.longitude,
            }));
          })
        );
        allShelters = googleResults.flat();
      } catch {
        // Google failed — will try Overpass below
      }

      // Attempt 2: Overpass fallback if Google returned nothing
      if (allShelters.length === 0) {
        const radius = 0.1; // ~11km in degrees
        const overpassResults = await Promise.all(
          OVERPASS_SHELTER_TYPES.map(async (type) => {
            try {
              const res = await fetch(
                `/api/overpass?type=${type}&south=${userLocation.lat - radius}&north=${userLocation.lat + radius}&west=${userLocation.lng - radius}&east=${userLocation.lng + radius}`
              );
              if (!res.ok) return [];
              const data = await res.json() as {
                resources?: { name?: string; lat: number; lng: number; latitude?: number; longitude?: number }[];
              };
              return (data.resources ?? []).map((r) => ({
                name: r.name ?? type,
                lat: r.lat ?? r.latitude ?? 0,
                lng: r.lng ?? r.longitude ?? 0,
              }));
            } catch { return []; }
          })
        );
        allShelters = overpassResults.flat();
      }

      if (allShelters.length === 0) {
        setError("No shelters or safe buildings found nearby. Ask the AI for alternatives.");
        setLoading(false);
        return;
      }

      // Sort by actual haversine distance and pick the nearest
      const withDistance = allShelters
        .filter((s) => s.lat !== 0 && s.lng !== 0)
        .map((s) => ({
          ...s,
          distanceKm: haversineDist(userLocation.lat, userLocation.lng, s.lat, s.lng),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);

      if (withDistance.length === 0) {
        setError("No valid shelter locations found. Ask the AI for help.");
        setLoading(false);
        return;
      }

      const nearest = withDistance[0]!;

      // Calculate route to nearest shelter
      const routeRes = await fetch(
        `/api/osrm?startLat=${userLocation.lat}&startLng=${userLocation.lng}&endLat=${nearest.lat}&endLng=${nearest.lng}&profile=foot&alternatives=false`
      );
      const routeData = await routeRes.json() as { routes?: RouteData[] };
      const routes = routeData.routes ?? [];

      if (routes.length === 0) {
        setError("Could not calculate route. The shelter is " + nearest.distanceKm.toFixed(1) + "km away.");
        setLoading(false);
        return;
      }

      const route = {
        ...routes[0]!,
        safetyScore: calculateSafetyScore(routes[0]!.geometry.coordinates, events, reports),
      };

      setRoutes([route]);
      setSelectedRoute(route);
      flyTo([nearest.lat, nearest.lng]);

      setResult({
        name: nearest.name,
        lat: nearest.lat,
        lng: nearest.lng,
        distanceKm: nearest.distanceKm,
        route,
      });
      setShowResult(true);
    } catch {
      setError("Failed to find safe route. Ask the AI assistant for help.");
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    setShowResult(false);
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full space-y-2">
      {/* Main button */}
      <motion.button
        whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(220,38,38,0.4)" }}
        whileTap={{ scale: 0.97 }}
        onClick={handlePress}
        disabled={loading}
        className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-70 text-white font-bold py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-3 shadow-lg shadow-red-900/40 transition-all min-h-[60px] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Finding nearest shelter…
          </>
        ) : (
          <>
            <Shield className="w-5 h-5" />
            GET TO SAFETY NOW
          </>
        )}
      </motion.button>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result card */}
      <AnimatePresence>
        {showResult && result?.route && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            className="bg-[#0d1424] border border-white/10 rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Nearest Safe Location</p>
                <p className="font-bold text-white text-sm">{result.name}</p>
              </div>
              <button onClick={dismiss} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5 text-sm text-slate-300">
                <Route className="w-3.5 h-3.5 text-teal" />
                {formatDistance(result.route.distanceKm)}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-300">
                <Clock className="w-3.5 h-3.5 text-teal" />
                {formatDuration(result.route.durationMinutes)}
              </div>
              <div
                className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: safetyScoreColor(result.route.safetyScore) }}
              >
                {result.route.safetyScore}/100 · {safetyScoreLabel(result.route.safetyScore)}
              </div>
            </div>

            <div className="flex gap-2">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={`/route?destLat=${result.lat}&destLng=${result.lng}&destName=${encodeURIComponent(result.name)}`}
                className="flex-1 bg-teal hover:bg-sky-500 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Full Directions
              </motion.a>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenAI?.(`Find me the safest route to the nearest shelter from my location. Check for any threats along the way.`)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-all"
              >
                <Bot className="w-3.5 h-3.5 text-teal" />
                Ask AI
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
