"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import VisualModeSelector from "@/components/globe/VisualModeSelector";
import LayerPanel from "@/components/globe/LayerPanel";
import CCTVPanel from "@/components/globe/CCTVPanel";
import { useReports } from "@/hooks/useReports";
import { useFlights } from "@/hooks/useFlights";
import { useSeismic } from "@/hooks/useSeismic";
import { useSatellites } from "@/hooks/useSatellites";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import { cn } from "@/lib/utils/cn";
import type { GlobeLayerToggles } from "@/components/globe/globe-layers";
import type {
  ConflictPointFeature,
  IntelligenceGlobeHandle,
} from "@/components/globe/IntelligenceGlobe";
import type { Flight } from "@/types/intelligence";
import type { SeismicEvent } from "@/types/intelligence";

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
  const layers = useMapStore((s) => s.globeLayers);
  const toggleGlobeLayer = useMapStore((s) => s.toggleGlobeLayer);
  const [rawFeatures, setRawFeatures] = useState<unknown[]>([]);
  const globeRef = useRef<IntelligenceGlobeHandle>(null);
  const mode = useAppStore((s) => s.globeVisualMode);
  const [hoverFlight, setHoverFlight] = useState<Flight | null>(null);
  const [quakeDetail, setQuakeDetail] = useState<SeismicEvent | null>(null);

  const flightsEnabled = layers.flights || layers.military;
  const { commercial, military, loading: flightsLoading } = useFlights(flightsEnabled);
  const { events: earthquakes, loading: seismicLoading } = useSeismic(layers.seismic);
  const { satellites, loading: satLoading } = useSatellites(layers.satellites);

  useEffect(() => {
    if (!quakeDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuakeDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quakeDetail]);

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
    toggleGlobeLayer(key);
  };

  const counts = useMemo(
    () => ({
      conflict: conflictFeatures.length,
      reports: reports.length,
      flights: commercial.length,
      military: military.length,
      seismic: earthquakes.length,
      satellites: satellites.length,
      cctv: layers.cctv ? 5 : 0,
    }),
    [
      conflictFeatures.length,
      reports.length,
      commercial.length,
      military.length,
      earthquakes.length,
      satellites.length,
      layers.cctv,
    ]
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
            commercialFlights={commercial}
            militaryFlights={military}
            earthquakes={earthquakes}
            satellites={satellites}
            onFlightHover={setHoverFlight}
            onEarthquakeSelect={setQuakeDetail}
          />
        </div>
        <VisualModeSelector />
        <LayerPanel layers={layers} onToggle={toggle} counts={counts} />
        {layers.cctv && <CCTVPanel />}

        {(flightsLoading || seismicLoading || satLoading) && (
          <div className="absolute top-16 left-3 z-[560] text-[10px] text-slate-400 bg-black/50 px-2 py-1 rounded border border-white/10">
            Updating intelligence layers…
          </div>
        )}

        {hoverFlight && (layers.flights || layers.military) && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[560] max-w-sm w-[min(100vw-24px,320px)] rounded-lg border border-white/15 bg-black/70 backdrop-blur-md px-3 py-2 text-xs text-slate-100 shadow-xl pointer-events-none">
            <p className="font-semibold text-white">
              {(hoverFlight.callsign ?? "").trim() || hoverFlight.icao24}
              {hoverFlight.isMilitary ? (
                <span className="text-orange-400 ml-1">· Military</span>
              ) : null}
            </p>
            <p className="text-slate-300 mt-0.5">
              Alt{" "}
              {hoverFlight.altitude != null
                ? `${Math.round(hoverFlight.altitude)} m`
                : "—"}{" "}
              · Speed{" "}
              {hoverFlight.velocity != null
                ? `${Math.round(hoverFlight.velocity)} m/s`
                : "—"}
              {hoverFlight.heading != null
                ? ` · Hdg ${Math.round(hoverFlight.heading)}°`
                : ""}
            </p>
            {(hoverFlight.origin || hoverFlight.destination) && (
              <p className="text-slate-400 mt-1 text-[10px]">
                {[hoverFlight.origin, hoverFlight.destination].filter(Boolean).join(" → ")}
              </p>
            )}
          </div>
        )}

        {quakeDetail && (
          <div
            className="absolute inset-0 z-[580] flex items-center justify-center p-4 bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-label="Earthquake details"
            onClick={() => setQuakeDetail(null)}
          >
            <div
              className="max-w-md w-full rounded-xl border border-white/15 bg-[#0f172a] p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-white">Seismic event</h2>
              <p className="text-slate-300 mt-2 text-sm">{quakeDetail.place}</p>
              <ul className="mt-3 text-sm text-slate-400 space-y-1">
                <li>Magnitude: {quakeDetail.magnitude.toFixed(1)}</li>
                <li>
                  Depth:{" "}
                  {quakeDetail.depth != null ? `${quakeDetail.depth.toFixed(1)} km` : "—"}
                </li>
                <li>Time: {new Date(quakeDetail.time).toUTCString()}</li>
                {quakeDetail.inConflictZone ? (
                  <li className="text-amber-400">
                    Near an active / monitored conflict region (heuristic).
                  </li>
                ) : null}
              </ul>
              <button
                type="button"
                className="mt-4 w-full rounded-lg bg-teal/20 border border-teal/40 py-2 text-sm text-white hover:bg-teal/30"
                onClick={() => setQuakeDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
