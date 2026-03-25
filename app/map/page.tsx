"use client";
import dynamic from "next/dynamic";
import { Suspense, useState, useEffect, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import { Layers, Eye, EyeOff, Route, Bot } from "lucide-react";
import Link from "next/link";
import { useMapStore } from "@/store/mapStore";
import { useAppStore } from "@/store/appStore";
import VisualModeSelector from "@/components/map/VisualModeSelector";
import SitrepLauncher from "@/components/map/SitrepLauncher";

const CrisisMap = dynamic(() => import("@/components/map/CrisisMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-slate-200 animate-pulse flex items-center justify-center h-full">
      <p className="text-slate-500 text-sm">Loading map...</p>
    </div>
  ),
});

function LayerControls() {
  const { activeLayers, toggleLayer } = useMapStore();
  const [open, setOpen] = useState(false);

  const layers = [
    { key: "conflictEvents" as const, label: "Conflict Events", emoji: "⚠️" },
    { key: "reports" as const, label: "Community Reports", emoji: "📍" },
    { key: "resources" as const, label: "Resources", emoji: "🏥" },
    { key: "dangerZones" as const, label: "Danger Zones", emoji: "🔴" },
  ];

  return (
    <div className="absolute bottom-20 right-3 z-[500]">
      <button
        onClick={() => setOpen(!open)}
        className="bg-navy text-white p-3 rounded-full shadow-lg mb-2 flex items-center gap-1"
        aria-label="Toggle layers"
      >
        <Layers className="w-5 h-5" />
      </button>
      {open && (
        <div className="bg-white rounded-xl shadow-lg p-3 space-y-2 w-44">
          {layers.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`w-full flex items-center gap-2 text-sm p-1.5 rounded-lg transition-colors ${
                activeLayers[key] ? "bg-teal/10 text-teal" : "text-slate-500"
              }`}
            >
              {activeLayers[key] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>
                {emoji} {label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MapContent() {
  const params = useSearchParams();
  const region = params.get("region") || "Ukraine";

  const regionToCountry: Record<string, string> = {
    Ukraine: "Ukraine",
    Gaza: "Palestine",
    Sudan: "Sudan",
    Myanmar: "Myanmar",
    Yemen: "Yemen",
    Syria: "Syria",
  };

  return <CrisisMap country={regionToCountry[region] || region} />;
}

export default function MapPage() {
  const visualMode = useAppStore((s) => s.visualMode);

  useEffect(() => {
    document.documentElement.classList.toggle("crt-mode", visualMode === "crt");
    return () => document.documentElement.classList.remove("crt-mode");
  }, [visualMode]);

  const filterStyle: CSSProperties | undefined =
    visualMode === "flir"
      ? { filter: "saturate(0%) brightness(1.5) contrast(2)" }
      : visualMode === "night"
        ? { filter: "saturate(0%) brightness(1.2) contrast(1.3)" }
        : undefined;

  return (
    <div
      className={`h-screen flex flex-col bg-navy overflow-hidden ${
        visualMode === "night" ? "map-shell-night-vision" : ""
      }`}
    >
      <TopBar extraActions={<SitrepLauncher />} />
      <div className="flex-1 relative mt-14 mb-14 min-h-0">
        <div
          className={`absolute inset-0 ${visualMode === "flir" ? "map-visual-flir" : ""}`}
          style={filterStyle}
        >
          {visualMode === "flir" && (
            <div
              className="absolute inset-0 pointer-events-none z-[450]"
              style={{
                background: "radial-gradient(circle, rgba(255,100,0,0.3), transparent 70%)",
              }}
            />
          )}
          {visualMode === "night" && (
            <>
              <div
                className="absolute inset-0 pointer-events-none z-[450]"
                style={{ background: "rgba(0, 255, 70, 0.12)" }}
              />
              <div
                className="absolute inset-0 pointer-events-none z-[451]"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
                }}
              />
            </>
          )}
          <Suspense
            fallback={
              <div className="h-full bg-slate-200 animate-pulse flex items-center justify-center">
                <p className="text-slate-500">Loading...</p>
              </div>
            }
          >
            <MapContent />
          </Suspense>
        </div>
        <VisualModeSelector />
        <LayerControls />

        {/* Cross-tab quick actions */}
        <div className="absolute bottom-20 left-3 z-[500] flex flex-col gap-2">
          <Link
            href="/route"
            className="flex items-center gap-1.5 bg-teal text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg hover:bg-sky-500 transition-colors"
          >
            <Route className="w-3.5 h-3.5" />
            Plan Route
          </Link>
          <Link
            href="/assistant"
            className="flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg border border-white/20 hover:bg-white/10 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-teal" />
            Ask AI
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
