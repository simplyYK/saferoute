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
  distanceKm?: number;
  route?: RouteData;
}

interface GetToSafetyButtonProps {
  onOpenAI?: (prompt?: string) => void;
}

export default function GetToSafetyButton({ onOpenAI }: GetToSafetyButtonProps) {
  const userLocation = useAppStore((s) => s.userLocation);
  const { setRoutes, setSelectedRoute } = useMapStore();
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
      // Step 1: find nearest shelter
      const radius = 0.25;
      const overpassRes = await fetch(
        `/api/overpass?type=shelter&south=${userLocation.lat - radius}&north=${userLocation.lat + radius}&west=${userLocation.lng - radius}&east=${userLocation.lng + radius}`
      );
      const overpassData = await overpassRes.json() as {
        resources?: { name?: string; lat: number; lng: number }[];
      };
      const shelters = overpassData.resources ?? [];

      if (shelters.length === 0) {
        setError("No shelters found nearby. Try 'Find Help' for more options.");
        setLoading(false);
        return;
      }

      // Pick nearest shelter (simple Euclidean for speed)
      const nearest = shelters.reduce((best, s) => {
        const d = Math.hypot(s.lat - userLocation.lat, s.lng - userLocation.lng);
        const bd = Math.hypot(best.lat - userLocation.lat, best.lng - userLocation.lng);
        return d < bd ? s : best;
      });

      // Step 2: calculate route
      const routeRes = await fetch(
        `/api/osrm?startLat=${userLocation.lat}&startLng=${userLocation.lng}&endLat=${nearest.lat}&endLng=${nearest.lng}&profile=foot&alternatives=false`
      );
      const routeData = await routeRes.json() as { routes?: RouteData[] };
      const routes = routeData.routes ?? [];

      if (routes.length === 0) {
        setError("Could not calculate route to shelter.");
        setLoading(false);
        return;
      }

      const route = {
        ...routes[0]!,
        safetyScore: calculateSafetyScore(routes[0]!.geometry.coordinates, events, reports),
      };

      setRoutes([route]);
      setSelectedRoute(route);

      const distKm = Math.hypot(nearest.lat - userLocation.lat, nearest.lng - userLocation.lng) * 111;
      setResult({
        name: nearest.name ?? "Emergency Shelter",
        lat: nearest.lat,
        lng: nearest.lng,
        distanceKm: distKm,
        route,
      });
      setShowResult(true);
    } catch {
      setError("Failed to find safe route. Try the AI assistant.");
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
        {/* Animated shimmer */}
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
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Nearest Shelter</p>
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
