"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import VisualModeSelector from "@/components/globe/VisualModeSelector";
import LayerPanel from "@/components/globe/LayerPanel";
import { useReports } from "@/hooks/useReports";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils/cn";
import {
  defaultGlobeLayers,
  type GlobeLayerToggles,
} from "@/components/globe/globe-layers";
import type {
  ConflictPointFeature,
  IntelligenceGlobeHandle,
} from "@/components/globe/IntelligenceGlobe";

const IntelligenceGlobe = dynamic(
  () => import("@/components/globe/IntelligenceGlobe"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[#0a0f1e] flex items-center justify-center text-slate-500 text-sm">
        Loading globe…
      </div>
    ),
  }
);

export default function GlobePage() {
  const { reports } = useReports();
  const [layers, setLayers] = useState<GlobeLayerToggles>(defaultGlobeLayers);
  const [rawFeatures, setRawFeatures] = useState<unknown[]>([]);
  const globeRef = useRef<IntelligenceGlobeHandle>(null);
  const mode = useAppStore((s) => s.globeVisualMode);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/acled?country=Ukraine");
        const json = (await res.json()) as { features?: unknown[] };
        if (!cancelled && Array.isArray(json.features)) {
          setRawFeatures(json.features);
        }
      } catch {
        if (!cancelled) setRawFeatures([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const conflictFeatures = useMemo((): ConflictPointFeature[] => {
    const out: ConflictPointFeature[] = [];
    for (const f of rawFeatures) {
      if (!f || typeof f !== "object") continue;
      const feat = f as Record<string, unknown>;
      if (feat.type !== "Feature") continue;
      const geom = feat.geometry as Record<string, unknown> | undefined;
      if (!geom || geom.type !== "Point") continue;
      const coords = geom.coordinates as unknown;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const props =
        feat.properties && typeof feat.properties === "object"
          ? (feat.properties as Record<string, unknown>)
          : {};
      out.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(coords[0]), Number(coords[1])],
        },
        properties: props,
      });
    }
    return out;
  }, [rawFeatures]);

  const toggle = (key: keyof GlobeLayerToggles) => {
    setLayers((L) => ({ ...L, [key]: !L[key] }));
  };

  const counts = useMemo(
    () => ({
      conflict: conflictFeatures.length,
      reports: reports.length,
      flights: 0,
      military: 0,
      seismic: 0,
      satellites: 0,
      cctv: 0,
    }),
    [conflictFeatures.length, reports.length]
  );

  const filterStyle =
    mode === "flir"
      ? "sepia(100%) hue-rotate(300deg) saturate(500%) contrast(1.2)"
      : mode === "night"
        ? "saturate(0%) brightness(1.3) contrast(1.1) hue-rotate(90deg)"
        : mode === "crt"
          ? "contrast(1.08) brightness(1.05)"
          : undefined;

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1e] overflow-hidden text-white">
      <TopBar />
      <div className="flex-1 relative mt-14 mb-14 min-h-0">
        <div
          className={cn(
            "absolute inset-0 min-h-0",
            mode === "crt" && "globe-visual-wrap crt-scanlines"
          )}
          style={filterStyle ? { filter: filterStyle } : undefined}
        >
          {mode === "night" && (
            <div
              className="pointer-events-none absolute inset-0 z-[100] mix-blend-overlay"
              style={{ backgroundColor: "rgba(0, 255, 70, 0.08)" }}
              aria-hidden
            />
          )}
          {mode === "flir" && (
            <div
              className="pointer-events-none absolute inset-0 z-[100]"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 55% 42%, rgba(255, 120, 40, 0.35), rgba(80, 0, 0, 0.45) 55%, transparent 75%)",
                mixBlendMode: "hard-light",
              }}
              aria-hidden
            />
          )}
          <IntelligenceGlobe
            ref={globeRef}
            layers={layers}
            conflictFeatures={conflictFeatures}
            reports={reports}
          />
        </div>
        <VisualModeSelector />
        <LayerPanel layers={layers} onToggle={toggle} counts={counts} />
      </div>
      <BottomNav />
    </div>
  );
}
