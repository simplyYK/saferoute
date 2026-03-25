"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Navigation, X, ArrowUp, CornerUpLeft, CornerUpRight, ArrowUpRight, ArrowUpLeft } from "lucide-react";
import type { RouteData } from "@/types/map";
import { useMapStore } from "@/store/mapStore";

interface NavigationModeProps {
  route: RouteData;
  onEnd: () => void;
}

function calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function pointToSegmentDistance(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) return haversineDistance(p, a);
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy)));
  const proj = { lat: a.lat + t * dy, lng: a.lng + t * dx };
  return haversineDistance(p, proj);
}

function getDirectionIcon(instruction: string) {
  const lower = instruction.toLowerCase();
  if (lower.includes("right")) return CornerUpRight;
  if (lower.includes("left")) return CornerUpLeft;
  if (lower.includes("slight right") || lower.includes("bear right")) return ArrowUpRight;
  if (lower.includes("slight left") || lower.includes("bear left")) return ArrowUpLeft;
  return ArrowUp;
}

function formatDistanceNav(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatETA(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

export default function NavigationMode({ route, onEnd }: NavigationModeProps) {
  const flyTo = useMapStore((s) => s.flyTo);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [bearing, setBearing] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(route.distanceKm * 1000);
  const [distToNextTurn, setDistToNextTurn] = useState(0);
  const [eta, setEta] = useState(route.durationMinutes);
  const [speed, setSpeed] = useState(0);
  const [offRoute, setOffRoute] = useState(false);
  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevTimeRef = useRef<number>(0);

  // Route coordinates as {lat, lng} (input is [lng, lat])
  const routePoints = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

  const updateProgress = useCallback(
    (pos: { lat: number; lng: number }) => {
      // Find nearest point on route
      let minDist = Infinity;
      let nearestIdx = 0;
      for (let i = 0; i < routePoints.length - 1; i++) {
        const d = pointToSegmentDistance(pos, routePoints[i], routePoints[i + 1]);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }

      // Off-route check (> 100m from route)
      setOffRoute(minDist > 100);

      // Calculate remaining distance from nearest point to end
      let remaining = haversineDistance(pos, routePoints[nearestIdx + 1]);
      for (let i = nearestIdx + 1; i < routePoints.length - 1; i++) {
        remaining += haversineDistance(routePoints[i], routePoints[i + 1]);
      }
      setDistanceRemaining(remaining);

      // Determine current step based on accumulated distance
      let accum = 0;
      let stepIdx = 0;
      const stepsDistances = route.steps.map((s) => s.distance);
      for (let i = 0; i < routePoints.length - 1 && stepIdx < stepsDistances.length; i++) {
        if (i <= nearestIdx) {
          accum += haversineDistance(routePoints[i], routePoints[i + 1]);
        }
        let stepTotal = 0;
        for (let j = 0; j <= stepIdx; j++) stepTotal += stepsDistances[j];
        if (accum >= stepTotal && stepIdx < stepsDistances.length - 1) {
          stepIdx++;
        }
      }
      setCurrentStepIndex(stepIdx);

      // Distance to next turn
      let stepAccum = 0;
      for (let j = 0; j <= stepIdx; j++) stepAccum += stepsDistances[j];
      const distToTurn = Math.max(0, stepAccum - accum + haversineDistance(pos, routePoints[nearestIdx]));
      setDistToNextTurn(distToTurn);

      // Calculate speed from previous position
      const now = Date.now();
      if (prevPosRef.current && prevTimeRef.current) {
        const dt = (now - prevTimeRef.current) / 1000;
        if (dt > 0) {
          const dist = haversineDistance(prevPosRef.current, pos);
          const spd = dist / dt; // m/s
          setSpeed(spd * 3.6); // km/h
        }
      }

      // Calculate bearing
      if (prevPosRef.current) {
        const b = calculateBearing(prevPosRef.current, pos);
        setBearing(b);
      }

      prevPosRef.current = pos;
      prevTimeRef.current = now;

      // Estimate ETA
      const avgSpeed = speed > 1 ? speed / 3.6 : route.distanceKm * 1000 / (route.durationMinutes * 60);
      if (avgSpeed > 0) {
        setEta(remaining / avgSpeed / 60);
      }

      // Center map on user
      flyTo([pos.lat, pos.lng]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routePoints, route.steps, speed]
  );

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(newPos);
        updateProgress(newPos);
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateProgress]);

  const currentStep = route.steps[currentStepIndex];
  const nextStep = route.steps[currentStepIndex + 1];
  const DirIcon = currentStep ? getDirectionIcon(currentStep.instruction) : ArrowUp;

  return (
    <div className="fixed inset-0 z-[2000] pointer-events-none">
      {/* Top: Direction instruction */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto absolute top-0 left-0 right-0 z-10"
      >
        <div
          className="px-4 pt-3 pb-4"
          style={{ background: "linear-gradient(to bottom, rgba(10,15,30,0.95), rgba(10,15,30,0.8), transparent)" }}
        >
          <div className="flex items-start gap-3 max-w-lg mx-auto">
            <div className="bg-teal/20 p-3 rounded-2xl shrink-0">
              <DirIcon className="w-8 h-8 text-teal" style={{ transform: `rotate(${bearing}deg)` }} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-white font-bold text-lg leading-tight truncate">
                {currentStep?.instruction || "Proceed on route"}
              </p>
              <p className="text-teal text-sm font-semibold mt-0.5">
                {formatDistanceNav(distToNextTurn)}
              </p>
              {nextStep && (
                <p className="text-slate-400 text-xs mt-1 truncate">
                  Then: {nextStep.instruction}
                </p>
              )}
            </div>
          </div>
          {offRoute && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 bg-amber-500/20 border border-amber-500/30 rounded-xl px-3 py-2 text-center max-w-lg mx-auto"
            >
              <p className="text-amber-400 text-sm font-semibold">Recalculating...</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* User position indicator (CSS-based pulsing dot) */}
      {userPos && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative">
            <div className="w-5 h-5 bg-blue-500 rounded-full border-[3px] border-white shadow-lg shadow-blue-500/50" />
            <div className="absolute inset-0 bg-blue-500/40 rounded-full animate-ping" />
          </div>
        </div>
      )}

      {/* Bottom: Stats + End button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto absolute bottom-0 left-0 right-0 z-10"
      >
        <div
          className="px-4 pb-6 pt-8"
          style={{ background: "linear-gradient(to top, rgba(10,15,30,0.95), rgba(10,15,30,0.8), transparent)" }}
        >
          <div className="max-w-lg mx-auto bg-[#0d1424]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-white font-bold text-lg">{Math.round(speed)}</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider">km/h</p>
              </div>
              <div className="text-center">
                <p className="text-teal font-bold text-lg">{formatETA(eta)}</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider">ETA</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{formatDistanceNav(distanceRemaining)}</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider">Remaining</p>
              </div>
            </div>
            <button
              onClick={onEnd}
              className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              End Navigation
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
