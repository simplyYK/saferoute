"use client";
import dynamic from "next/dynamic";
import { Suspense, useState, useEffect, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import {
  Layers, Eye, EyeOff, Hospital, Home,
  Pill, Droplets, Siren,
} from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useAppStore } from "@/store/appStore";
import VisualModeSelector from "@/components/map/VisualModeSelector";
import SitrepLauncher from "@/components/map/SitrepLauncher";
import SafetyDashboard from "@/components/map/SafetyDashboard";
import GetToSafetyButton from "@/components/map/GetToSafetyButton";

const CrisisMap = dynamic(() => import("@/components/map/CrisisMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-[#0a0f1e] animate-pulse flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

// ─── Layer Controls ───────────────────────────────────────────────
function LayerControls() {
  const { activeLayers, toggleLayer } = useMapStore();
  const [open, setOpen] = useState(false);

  const coreLayersData = [
    { key: "conflictEvents" as const, label: "Conflicts", emoji: "⚠️" },
    { key: "reports" as const, label: "Reports", emoji: "📍" },
    { key: "dangerZones" as const, label: "Danger Zones", emoji: "🔴" },
  ];

  const resourceLayersData = [
    { key: "hospitals" as const, label: "Hospitals", icon: Hospital, color: "text-red-400" },
    { key: "pharmacies" as const, label: "Pharmacies", icon: Pill, color: "text-green-400" },
    { key: "shelters" as const, label: "Shelters", icon: Home, color: "text-blue-400" },
    { key: "police" as const, label: "Police", icon: Siren, color: "text-indigo-400" },
    { key: "water" as const, label: "Water", icon: Droplets, color: "text-cyan-400" },
  ];

  return (
    <div className="absolute bottom-28 right-3 z-[500]">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="bg-[#0d1424]/90 backdrop-blur-md text-white p-3 rounded-full shadow-xl border border-white/10 mb-2"
        aria-label="Map layers"
      >
        <Layers className="w-5 h-5 text-teal" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#0d1424]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-3 w-52 mb-2 space-y-3"
          >
            {/* Core layers */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 px-1">Intelligence</p>
              {coreLayersData.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className={`w-full flex items-center gap-2.5 text-sm p-2 rounded-xl transition-all ${
                    activeLayers[key]
                      ? "bg-teal/15 text-teal"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {activeLayers[key] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{emoji} {label}</span>
                </button>
              ))}
            </div>

            {/* Resource layers */}
            <div className="border-t border-white/6 pt-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 px-1">Resources</p>
              {resourceLayersData.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className={`w-full flex items-center gap-2.5 text-sm p-2 rounded-xl transition-all ${
                    activeLayers[key]
                      ? `bg-white/8 ${color}`
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  {activeLayers[key] && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Map Content ──────────────────────────────────────────────────
function MapContent() {
  const params = useSearchParams();
  const viewCountry = useMapStore((s) => s.viewCountry);
  const setViewCountry = useMapStore((s) => s.setViewCountry);
  const region = params.get("region");

  useEffect(() => {
    if (region) {
      const regionToCountry: Record<string, string> = {
        ukraine: "Ukraine", gaza: "Palestine", sudan: "Sudan",
        myanmar: "Myanmar", yemen: "Yemen", syria: "Syria",
        lebanon: "Lebanon", ethiopia: "Ethiopia", somalia: "Somalia",
        afghanistan: "Afghanistan", drc: "Democratic Republic of Congo",
      };
      const country = regionToCountry[region.toLowerCase()] || region;
      setViewCountry(country);
    }
  }, [region, setViewCountry]);

  return <CrisisMap country={viewCountry} />;
}

// ─── Main Map Page ────────────────────────────────────────────────
export default function MapPage() {
  const visualMode = useAppStore((s) => s.visualMode);

  useEffect(() => {
    document.documentElement.classList.toggle("crt-mode", visualMode === "crt");
    document.documentElement.classList.toggle("blackout-mode", visualMode === "blackout");
    return () => {
      document.documentElement.classList.remove("crt-mode");
      document.documentElement.classList.remove("blackout-mode");
    };
  }, [visualMode]);

  const filterStyle: CSSProperties | undefined =
    visualMode === "flir"
      ? { filter: "saturate(0%) brightness(1.5) contrast(2)" }
      : visualMode === "night"
        ? { filter: "saturate(0%) brightness(1.2) contrast(1.3)" }
        : visualMode === "blackout"
          ? { filter: "saturate(0%) brightness(0.3) contrast(3)" }
          : undefined;

  return (
    <div
      className={`h-screen flex flex-col bg-[#0a0f1e] overflow-hidden ${
        visualMode === "night" ? "map-shell-night-vision" : ""
      }`}
    >
      <TopBar extraActions={<SitrepLauncher />} />

      <div className="flex-1 relative mt-14 mb-14 min-h-0">
        {/* Map */}
        <div
          className={`absolute inset-0 ${visualMode === "flir" ? "map-visual-flir" : ""}`}
          style={filterStyle}
        >
          {visualMode === "flir" && (
            <div className="absolute inset-0 pointer-events-none z-[450]"
              style={{ background: "radial-gradient(circle, rgba(255,100,0,0.3), transparent 70%)" }} />
          )}
          {visualMode === "blackout" && (
            <div className="absolute inset-0 pointer-events-none z-[450]"
              style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(220, 38, 38, 0.25), transparent 70%)", mixBlendMode: "screen" }} />
          )}
          {visualMode === "night" && (
            <>
              <div className="absolute inset-0 pointer-events-none z-[450]" style={{ background: "rgba(0, 255, 70, 0.12)" }} />
              <div className="absolute inset-0 pointer-events-none z-[451]"
                style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)" }} />
            </>
          )}
          <Suspense fallback={
            <div className="h-full bg-[#0a0f1e] animate-pulse flex items-center justify-center">
              <p className="text-slate-500">Loading...</p>
            </div>
          }>
            <MapContent />
          </Suspense>
        </div>

        {/* Risk Card */}
        <SafetyDashboard />

        {/* Visual mode selector */}
        <VisualModeSelector />

        {/* Layer controls */}
        <LayerControls />

        {/* Bottom overlay: GET TO SAFETY */}
        <div className="absolute bottom-0 left-0 right-0 z-[500] pointer-events-none">
          <div className="pointer-events-auto">
            <div className="h-12 bg-gradient-to-t from-[#0a0f1e]/80 to-transparent" />
            <div className="bg-[#0a0f1e]/85 backdrop-blur-md px-3 pb-2 pt-1">
              <GetToSafetyButton onOpenAI={(prompt) => {
                window.dispatchEvent(new CustomEvent("sentinel:open-ai", { detail: prompt }));
              }} />
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
