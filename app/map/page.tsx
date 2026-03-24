"use client";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import { Layers, Eye, EyeOff } from "lucide-react";
import { useMapStore } from "@/store/mapStore";

const CrisisMap = dynamic(() => import("@/components/map/CrisisMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-slate-200 animate-pulse flex items-center justify-center">
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
              <span>{emoji} {label}</span>
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

  return (
    <CrisisMap country={regionToCountry[region] || region} />
  );
}

export default function MapPage() {
  return (
    <div className="h-screen flex flex-col bg-navy overflow-hidden">
      <TopBar />
      <div className="flex-1 relative mt-14 mb-14 min-h-0 h-full">
        <Suspense
          fallback={
            <div className="flex-1 bg-slate-200 animate-pulse flex items-center justify-center">
              <p className="text-slate-500">Loading...</p>
            </div>
          }
        >
          <MapContent />
          <LayerControls />
        </Suspense>
      </div>
      <BottomNav />
    </div>
  );
}
