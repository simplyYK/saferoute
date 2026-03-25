"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Navigation, X } from "lucide-react";
import type { RouteData } from "@/types/map";
import { useAppStore } from "@/store/appStore";

interface NavigationModeProps {
  route: RouteData;
  onEnd: () => void;
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
  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const [distanceRemaining, setDistanceRemaining] = useState(route.distanceKm * 1000);
  const [eta, setEta] = useState(route.durationMinutes);

  // Pre-compute route points once
  const routePoints = useRef(
    route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
  ).current;

  // Average speed (m/s) from route metadata — used for ETA when GPS unavailable
  const avgSpeedMs = useRef(
    (route.distanceKm * 1000) / Math.max(route.durationMinutes * 60, 1)
  ).current;

  useEffect(() => {
    if (!navigator.geolocation) return;

    const poll = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;

          // Update the blue dot on the map (UserLocationMarker reads this)
          setUserLocation({ lat, lng });

          // Find nearest route point to estimate remaining distance
          let nearestIdx = 0;
          let minDist = Infinity;
          for (let i = 0; i < routePoints.length; i++) {
            const d = haversineDistance({ lat, lng }, routePoints[i]);
            if (d < minDist) { minDist = d; nearestIdx = i; }
          }

          let remaining = 0;
          for (let i = nearestIdx; i < routePoints.length - 1; i++) {
            remaining += haversineDistance(routePoints[i], routePoints[i + 1]);
          }
          setDistanceRemaining(remaining);
          if (avgSpeedMs > 0) setEta(remaining / avgSpeedMs / 60);
        },
        undefined,
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 15000 },
      );
    };

    poll(); // immediate first poll
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [routePoints, avgSpeedMs, setUserLocation]);

  return (
    <div className="fixed inset-0 z-[2000] pointer-events-none">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto absolute top-0 left-0 right-0"
      >
        <div
          className="px-4 pt-3 pb-5"
          style={{ background: "linear-gradient(to bottom, rgba(10,15,30,0.95), rgba(10,15,30,0.7), transparent)" }}
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="bg-teal/20 p-2.5 rounded-xl shrink-0">
              <Navigation className="w-5 h-5 text-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Navigating</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {formatDistanceNav(distanceRemaining)} remaining · ETA {formatETA(eta)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto absolute bottom-0 left-0 right-0"
      >
        <div
          className="px-4 pb-6 pt-8"
          style={{ background: "linear-gradient(to top, rgba(10,15,30,0.95), rgba(10,15,30,0.7), transparent)" }}
        >
          <div className="max-w-lg mx-auto bg-[#0d1424]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
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
