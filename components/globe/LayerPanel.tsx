"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { GlobeLayerToggles } from "./globe-layers";

type LayerKey = keyof GlobeLayerToggles;

const ROWS: { key: LayerKey; label: string; emoji: string }[] = [
  { key: "conflict", label: "Conflict Events (ACLED)", emoji: "⚔️" },
  { key: "reports", label: "Community Reports", emoji: "📍" },
  { key: "flights", label: "Live Flights (OpenSky)", emoji: "✈️" },
  { key: "military", label: "Military Aircraft (ADSB)", emoji: "🛩️" },
  { key: "seismic", label: "Seismic Activity", emoji: "🌍" },
  { key: "satellites", label: "Satellites Overhead", emoji: "🛰️" },
  { key: "cctv", label: "CCTV Feeds", emoji: "📷" },
];

type Counts = {
  conflict: number;
  reports: number;
  flights: number;
  military: number;
  seismic: number;
  satellites: number;
  cctv: number;
};

interface LayerPanelProps {
  layers: GlobeLayerToggles;
  onToggle: (key: LayerKey) => void;
  counts: Counts;
}

function formatCount(n: number, singular: string) {
  return `${n} ${singular}${n === 1 ? "" : "s"}`;
}

export default function LayerPanel({ layers, onToggle, counts }: LayerPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "absolute top-14 bottom-16 right-0 z-[550] flex transition-[width] duration-200 ease-out",
        collapsed ? "w-12" : "w-[280px]"
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="h-11 w-8 shrink-0 mt-4 rounded-l-lg bg-black/50 border border-r-0 border-white/10 text-slate-300 flex items-center justify-center hover:bg-black/60"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand layers" : "Collapse layers"}
      >
        {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      <div
        className={cn(
          "flex-1 min-w-0 bg-black/40 backdrop-blur-md border-l border-white/10 flex flex-col overflow-hidden",
          collapsed && "pointer-events-none opacity-0 w-0"
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
          <Layers className="w-4 h-4 text-teal shrink-0" />
          <span className="font-semibold text-sm text-white tracking-wide">Layers</span>
        </div>
        <ul className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
          {ROWS.map(({ key, label, emoji }) => {
            const on = layers[key];
            const count =
              key === "conflict"
                ? formatCount(counts.conflict, "event")
                : key === "reports"
                  ? formatCount(counts.reports, "report")
                  : key === "flights"
                    ? formatCount(counts.flights, "flight")
                    : key === "military"
                      ? formatCount(counts.military, "track")
                      : key === "seismic"
                        ? formatCount(counts.seismic, "reading")
                        : key === "satellites"
                          ? formatCount(counts.satellites, "sat")
                          : formatCount(counts.cctv, "feed");
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onToggle(key)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all border",
                    on
                      ? "border-teal/60 bg-teal/10 shadow-[0_0_12px_rgba(14,165,233,0.25)] text-white"
                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                  )}
                >
                  <span
                    className={cn(
                      "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                      on ? "bg-teal/40" : "bg-slate-600/50"
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full transition-all",
                        on ? "left-[18px] bg-teal shadow-[0_0_8px_#0EA5E9]" : "left-0.5 bg-slate-400"
                      )}
                    />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium block truncate">
                      {emoji} {label}
                    </span>
                    <span className={cn("text-[10px] mt-0.5", on ? "text-teal/80" : "text-slate-500")}>
                      {count}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
