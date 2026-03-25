"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import { REGIONS } from "@/lib/constants/regions";
import { SentinelIcon, SentinelWordmark } from "@/components/shared/SentinelLogo";

const DEMO_COORDS: Record<string, { lat: number; lng: number }> = {
  ukraine: { lat: 49.9935, lng: 36.2304 },
  gaza: { lat: 31.4167, lng: 34.3333 },
  sudan: { lat: 15.5007, lng: 32.5599 },
  myanmar: { lat: 19.7633, lng: 96.0785 },
  yemen: { lat: 15.3694, lng: 44.191 },
  syria: { lat: 34.8021, lng: 38.9968 },
};

export default function EntryScreen() {
  const router = useRouter();
  const { userLocation, setUserLocation, setDemoMode } = useAppStore();
  const { setCenter, setViewCountry } = useMapStore();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [showRegions, setShowRegions] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    const region = params.get("region")?.toLowerCase();
    if (demo === "true" && region && DEMO_COORDS[region]) {
      const coords = DEMO_COORDS[region];
      setDemoMode(true, region);
      setUserLocation(coords);
      setCenter([coords.lat, coords.lng]);
      const regionConfig = REGIONS.find((r) => r.id === region);
      if (regionConfig) setViewCountry(regionConfig.country);
      router.push("/map");
      return;
    }
    if (userLocation) router.push("/map");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported — choose a region below.");
      setShowRegions(true);
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setCenter([coords.lat, coords.lng]);
        router.push("/map");
      },
      () => {
        setLocating(false);
        setLocError("Location access denied — choose a region below.");
        setShowRegions(true);
      },
      { timeout: 8000 }
    );
  };

  const handleRegionSelect = (region: (typeof REGIONS)[0]) => {
    setViewCountry(region.country);
    setCenter(region.center);
    router.push(`/map?region=${region.id}`);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#060c1a] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Tactical grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(14,165,233,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Corner brackets */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-teal/20 pointer-events-none" />
      <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-teal/20 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-teal/20 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-teal/20 pointer-events-none" />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-teal/4 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center px-6 w-full max-w-2xl"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-teal/15 rounded-full blur-2xl scale-150 animate-pulse" />
            <SentinelIcon size={64} animated />
          </div>
          <div className="text-center">
            <SentinelWordmark size="lg" />
            <p className="text-[11px] text-slate-500 tracking-[0.3em] uppercase mt-1">Navigate. Survive. Report.</p>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-3">
            When danger surrounds you,{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #0EA5E9, #38BDF8, #7DD3FC)" }}
            >
              Sentinel shows you the way out.
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Live conflict mapping, safe route navigation, nearby resources,
            and AI-powered survival guidance — all in one app.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="w-full max-w-md mx-auto space-y-3 mb-5"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleUseLocation}
            disabled={locating}
            className="w-full relative text-white font-bold py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-3 disabled:opacity-70 min-h-[58px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
              boxShadow: "0 0 30px rgba(14,165,233,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            {locating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Acquiring location…</>
            ) : (
              <><MapPin className="w-4 h-4" />Use My Location</>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01, borderColor: "rgba(14,165,233,0.4)" }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowRegions(!showRegions)}
            className="w-full border border-white/12 text-slate-300 hover:text-white font-semibold py-3.5 px-6 rounded-2xl text-sm flex items-center justify-center gap-2.5 transition-all min-h-[52px] backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            Choose Conflict Region
            <motion.span animate={{ rotate: showRegions ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </motion.button>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {locError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-amber-400 text-xs mb-4 bg-amber-400/8 border border-amber-400/15 rounded-xl px-4 py-2.5 w-full max-w-md mx-auto"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {locError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Region grid */}
        <AnimatePresence>
          {showRegions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              className="w-full max-w-lg mx-auto overflow-hidden mb-5"
            >
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(14,165,233,0.04)", border: "1px solid rgba(14,165,233,0.12)" }}
              >
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold mb-3">
                  Active conflict zones
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {REGIONS.map((region, i) => (
                    <motion.button
                      key={region.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.035 }}
                      whileHover={{ scale: 1.03, backgroundColor: "rgba(14,165,233,0.1)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleRegionSelect(region)}
                      className="text-left px-3 py-2.5 rounded-xl border border-white/6 hover:border-teal/30 transition-all text-sm font-medium text-slate-300 hover:text-white"
                    >
                      {region.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex items-center gap-4 text-[10px] text-slate-600"
        >
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-green-500 rounded-full" />
            No sign-up
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-green-500 rounded-full" />
            Location private
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-green-500 rounded-full" />
            Works offline
          </span>
        </motion.div>
      </motion.div>
    </main>
  );
}
