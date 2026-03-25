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
import type { Flight, SeismicEvent, SatelliteTrack } from "@/types/intelligence";

export type ConflictPointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

export type IntelligenceGlobeProps = {
  layers: GlobeLayerToggles;
  conflictFeatures: ConflictPointFeature[];
  reports: Report[];
  commercialFlights: Flight[];
  militaryFlights: Flight[];
  earthquakes: SeismicEvent[];
  satellites: SatelliteTrack[];
  onFlightHover?: (flight: Flight | null) => void;
  onEarthquakeSelect?: (event: SeismicEvent) => void;
};

export type IntelligenceGlobeHandle = {
  getGlobe: () => GlobeInstance | null;
};

type PointRow = {
  latitude: number;
  longitude: number;
  alt: number;
  rad: number;
  color: string;
  label: string;
  kind: "conflict" | "report" | "military" | "satellite" | "seismic";
  flight?: Flight;
  quake?: SeismicEvent;
};

type ArcRow = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  altitude: number;
  label: string;
  flight: Flight;
};

type PathRow = {
  points: [number, number, number][];
  color: string;
};

type RingRow = {
  lat: number;
  lng: number;
  color: string;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
};

const EARTH_KM = 6371;

function toConflictPoints(features: ConflictPointFeature[]): PointRow[] {
  return features.map((f) => ({
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    alt: 0.01,
    rad: 0.3,
    color: "#DC2626",
    label: "Conflict event",
    kind: "conflict" as const,
  }));
}

function toReportPoints(reportList: Report[]): PointRow[] {
  return reportList.map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    alt: 0.01,
    rad: 0.3,
    color: "#FBBF24",
    label: r.title ?? "Community report",
    kind: "report" as const,
  }));
}

function arcFromFlight(f: Flight, dtSec = 20): ArcRow | null {
  if (f.onGround) return null;
  const v = f.velocity ?? 0;
  if (v < 2) return null;
  const h = ((f.heading ?? 0) * Math.PI) / 180;
  const lat0 = (f.lat * Math.PI) / 180;
  const dist = v * dtSec;
  const dLat = (dist * Math.cos(h)) / 111320;
  const dLng = (dist * Math.sin(h)) / (111320 * Math.cos(lat0));
  const cs = (f.callsign ?? "").trim() || f.icao24;
  const altM = f.altitude != null ? `${Math.round(f.altitude)} m` : "—";
  const spd = `${Math.round(v)} m/s`;
  return {
    startLat: f.lat - dLat,
    startLng: f.lng - dLng,
    endLat: f.lat,
    endLng: f.lng,
    color: "#3B82F6",
    altitude: 0.03,
    label: `${cs}\n${altM} · ${spd}`,
    flight: f,
  };
}

function militaryPoint(f: Flight): PointRow {
  const cs = (f.callsign ?? "").trim() || f.icao24;
  const altM = f.altitude != null ? `${Math.round(f.altitude)} m` : "—";
  const spd = f.velocity != null ? `${Math.round(f.velocity)} m/s` : "—";
  return {
    latitude: f.lat,
    longitude: f.lng,
    alt: 0.04,
    rad: 0.5,
    color: "#F97316",
    label: `${cs} (military)\n${altM} · ${spd}`,
    kind: "military",
    flight: f,
  };
}

function satellitePoint(s: SatelliteTrack): PointRow {
  const altGlobe = Math.max(0.003, s.altitude / EARTH_KM);
  const col = s.isStarlink
    ? "#3B82F6"
    : s.type === "military"
      ? "#EF4444"
      : "#94A3B8";
  const typeLabel = s.isStarlink
    ? "Starlink — Internet coverage available"
    : `${s.type} · ${Math.round(s.altitude)} km`;
  return {
    latitude: s.lat,
    longitude: s.lng,
    alt: altGlobe,
    rad: s.isStarlink ? 0.25 : 0.22,
    color: col,
    label: `${s.name}\n${typeLabel}`,
    kind: "satellite",
  };
}

function seismicPoint(q: SeismicEvent): PointRow {
  const zone = q.inConflictZone ? "\n⚠ Conflict-adjacent zone" : "";
  return {
    latitude: q.lat,
    longitude: q.lng,
    alt: 0.02,
    rad: 0.18,
    color: "rgba(248,250,252,0.35)",
    label: `M${q.magnitude.toFixed(1)} — ${q.place}${zone}\nClick for details`,
    kind: "seismic",
    quake: q,
  };
}

function quakeRing(q: SeismicEvent): RingRow {
  const mag = q.magnitude;
  const color = mag >= 5 ? "#DC2626" : mag >= 3 ? "#F59E0B" : "#3B82F6";
  return {
    lat: q.lat,
    lng: q.lng,
    color,
    maxR: mag * 1.5,
    propagationSpeed: 2,
    repeatPeriod: 700,
  };
}

const IntelligenceGlobe = forwardRef<IntelligenceGlobeHandle, IntelligenceGlobeProps>(
  function IntelligenceGlobe(
    {
      layers,
      conflictFeatures,
      reports,
      commercialFlights,
      militaryFlights,
      earthquakes,
      satellites,
      onFlightHover,
      onEarthquakeSelect,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<GlobeInstance | null>(null);
    const handlersRef = useRef({ onFlightHover, onEarthquakeSelect });
    handlersRef.current = { onFlightHover, onEarthquakeSelect };

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
        .pointAltitude((d) => (d as PointRow).alt)
        .pointRadius((d) => (d as PointRow).rad)
        .pointColor((d) => (d as PointRow).color)
        .pointLabel((d) => (d as PointRow).label)
        .arcsData([])
        .arcStartLat("startLat")
        .arcStartLng("startLng")
        .arcEndLat("endLat")
        .arcEndLng("endLng")
        .arcColor((d: object) => (d as ArcRow).color)
        .arcAltitude((d: object) => (d as ArcRow).altitude)
        .arcStroke(0.35)
        .arcDashLength(0.28)
        .arcDashGap(0.9)
        .arcDashAnimateTime(3800)
        .arcLabel((d: object) => (d as ArcRow).label)
        .pathsData([])
        .pathPoints("points")
        .pathPointLat((p: number[]) => p[0])
        .pathPointLng((p: number[]) => p[1])
        .pathPointAlt((p: number[]) => p[2])
        .pathColor((d: object) => (d as PathRow).color)
        .pathStroke(0.45)
        .ringsData([])
        .ringLat("lat")
        .ringLng("lng")
        .ringColor((d: object) => (d as RingRow).color)
        .ringMaxRadius((d: object) => (d as RingRow).maxR)
        .ringPropagationSpeed((d: object) => (d as RingRow).propagationSpeed)
        .ringRepeatPeriod((d: object) => (d as RingRow).repeatPeriod)
        .ringAltitude(0.004);

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

      globe.onArcHover((arc) => {
        const a = arc as ArcRow | null;
        if (a?.flight) handlersRef.current.onFlightHover?.(a.flight);
        else handlersRef.current.onFlightHover?.(null);
      });

      globe.onPointHover((pt) => {
        const r = pt as PointRow | null;
        if (r?.kind === "military" && r.flight) {
          handlersRef.current.onFlightHover?.(r.flight);
        } else if (!r) {
          handlersRef.current.onFlightHover?.(null);
        }
      });

      globe.onPointClick((pt) => {
        const r = pt as PointRow;
        if (r?.kind === "seismic" && r.quake) {
          handlersRef.current.onEarthquakeSelect?.(r.quake);
        }
      });

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
      const milPts = layers.military
        ? militaryFlights.map(militaryPoint)
        : [];
      const satPts = layers.satellites ? satellites.map(satellitePoint) : [];
      const seismicPts = layers.seismic ? earthquakes.map(seismicPoint) : [];

      globe.pointsData([
        ...conflictPts,
        ...reportPts,
        ...milPts,
        ...satPts,
        ...seismicPts,
      ]);

      const arcs: ArcRow[] =
        layers.flights
          ? commercialFlights
              .map((f) => arcFromFlight(f))
              .filter((a): a is ArcRow => a != null)
          : [];
      globe.arcsData(arcs);

      const rings: RingRow[] = layers.seismic ? earthquakes.map(quakeRing) : [];
      globe.ringsData(rings);

      const pathRows: PathRow[] = layers.satellites
        ? satellites.map((s) => {
            const col =
              s.type === "starlink"
                ? "#3B82F6"
                : s.type === "military"
                  ? "#EF4444"
                  : "#F8FAFC";
            return { points: s.path, color: col };
          })
        : [];
      globe.pathsData(pathRows);
    }, [
      layers,
      conflictFeatures,
      reports,
      commercialFlights,
      militaryFlights,
      earthquakes,
      satellites,
    ]);

    // Fly globe to centroid of conflict data when it changes significantly
    const prevConflictCount = useRef(conflictFeatures.length);
    useEffect(() => {
      const globe = globeRef.current;
      if (!globe || conflictFeatures.length === 0) return;
      // Only fly if the data meaningfully changed (new country loaded)
      if (Math.abs(conflictFeatures.length - prevConflictCount.current) < 2) return;
      prevConflictCount.current = conflictFeatures.length;

      // Compute centroid of conflict events
      let latSum = 0, lngSum = 0;
      for (const f of conflictFeatures) {
        latSum += f.geometry.coordinates[1];
        lngSum += f.geometry.coordinates[0];
      }
      const lat = latSum / conflictFeatures.length;
      const lng = lngSum / conflictFeatures.length;
      globe.pointOfView({ lat, lng, altitude: 2.0 }, 1200);
    }, [conflictFeatures]);

    return (
      <div ref={containerRef} className="absolute inset-0 w-full h-full min-h-0" />
    );
  }
);

export default IntelligenceGlobe;
