"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import Globe, { type GlobeInstance } from "globe.gl";
import type { Report } from "@/types/report";
import type { GlobeLayerToggles } from "./globe-layers";

export type ConflictPointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

export type IntelligenceGlobeProps = {
  layers: GlobeLayerToggles;
  conflictFeatures: ConflictPointFeature[];
  reports: Report[];
};

export type IntelligenceGlobeHandle = {
  getGlobe: () => GlobeInstance | null;
};

type PointRow = {
  latitude: number;
  longitude: number;
  layer: "conflict" | "report";
};

function toConflictPoints(features: ConflictPointFeature[]): PointRow[] {
  return features.map((f) => ({
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    layer: "conflict" as const,
  }));
}

function toReportPoints(reportList: Report[]): PointRow[] {
  return reportList.map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    layer: "report" as const,
  }));
}

const IntelligenceGlobe = forwardRef<IntelligenceGlobeHandle, IntelligenceGlobeProps>(
  function IntelligenceGlobe({ layers, conflictFeatures, reports }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<GlobeInstance | null>(null);

    useImperativeHandle(ref, () => ({
      getGlobe: () => globeRef.current,
    }));

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const globe = new Globe(el, { animateIn: true, waitForGlobeReady: true })
        .backgroundColor("#0a0f1e")
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
        .showAtmosphere(true)
        .atmosphereColor("#0EA5E9")
        .atmosphereAltitude(0.15)
        .pointLat("latitude")
        .pointLng("longitude")
        .pointColor((d) =>
          (d as PointRow).layer === "conflict" ? "#DC2626" : "#FBBF24"
        )
        .pointAltitude(0.01)
        .pointRadius(0.3)
        .arcsData([])
        .arcStartLat("startLat")
        .arcStartLng("startLng")
        .arcEndLat("endLat")
        .arcEndLng("endLng")
        .arcColor((d: object) => (d as { color: string }).color)
        .arcAltitude(0.1)
        .ringsData([])
        .ringLat("lat")
        .ringLng("lng")
        .ringColor((d: object) => (d as { color: string }).color)
        .ringMaxRadius(3);

      globeRef.current = globe;

      globe.pointOfView({ lat: 48, lng: 31, altitude: 2.5 }, 0);

      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;

      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      const onStart = () => {
        controls.autoRotate = false;
        if (idleTimer) clearTimeout(idleTimer);
      };
      const onEnd = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          controls.autoRotate = true;
        }, 3000);
      };
      controls.addEventListener("start", onStart);
      controls.addEventListener("end", onEnd);

      const resize = () => {
        globe.width(el.clientWidth).height(el.clientHeight);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (key) {
        void (async () => {
          try {
            const r = await fetch("/api/google-maps-tiles/session", {
              method: "POST",
            });
            if (!r.ok) return;
            const data = (await r.json()) as { session?: string };
            if (!data.session) return;
            globe
              .globeTileEngineUrl(
                (x, y, level) =>
                  `https://tile.googleapis.com/v1/2dtiles/${level}/${x}/${y}?session=${encodeURIComponent(
                    data.session as string
                  )}&key=${encodeURIComponent(key)}`
              )
              .globeTileEngineMaxLevel(14)
              .globeTileEngineClearCache();
          } catch {
            /* keep fallback textures */
          }
        })();
      }

      return () => {
        controls.removeEventListener("start", onStart);
        controls.removeEventListener("end", onEnd);
        if (idleTimer) clearTimeout(idleTimer);
        ro.disconnect();
        globe._destructor();
        globeRef.current = null;
      };
    }, []);

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) return;

      const conflictPts = layers.conflict ? toConflictPoints(conflictFeatures) : [];
      const reportPts = layers.reports ? toReportPoints(reports) : [];
      globe.pointsData([...conflictPts, ...reportPts]);

      const showArcs = layers.flights || layers.military;
      globe.arcsData(
        showArcs
          ? ([] as {
              startLat: number;
              startLng: number;
              endLat: number;
              endLng: number;
              color: string;
            }[])
          : []
      );

      globe.ringsData(
        layers.seismic
          ? ([] as { lat: number; lng: number; color: string }[])
          : []
      );
    }, [layers, conflictFeatures, reports]);

    return (
      <div ref={containerRef} className="absolute inset-0 w-full h-full min-h-0" />
    );
  }
);

export default IntelligenceGlobe;
