"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  Marker,
  useMap,
  useMapEvents,
  CircleMarker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useMapStore } from "@/store/mapStore";
import { useAppStore } from "@/store/appStore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useReports } from "@/hooks/useReports";
import { useConflictData } from "@/hooks/useConflictData";
import { useFirmsHotspots } from "@/hooks/useFirmsHotspots";
import { MAP_CONFIG } from "@/lib/constants/map-config";
import { REPORT_CATEGORIES } from "@/lib/constants/report-types";
import { safetyScoreColor } from "@/lib/utils/safety-score";
import type { Report } from "@/types/report";
import type { ConflictEvent } from "@/types/conflict";
import type { ThermalHotspot } from "@/lib/risk-intelligence";

// Fix Leaflet icon in webpack/Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createDivIcon(emoji: string, bg: string, size = 32, extraClass = "") {
  return L.divIcon({
    className: "",
    html: `<div class="${extraClass}" style="width:${size}px;height:${size}px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

function FlyToHandler() {
  const map = useMap();
  const flyTarget = useMapStore((s) => s.flyTarget);
  const clearFlyTarget = useMapStore((s) => s.clearFlyTarget);

  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget, 14, { animate: true, duration: 1.2 });
      clearFlyTarget();
    }
  }, [flyTarget, map, clearFlyTarget]);

  return null;
}

function MapEvents() {
  const { setCenter, setZoom, setBounds } = useMapStore();
  const map = useMap();

  useMapEvents({
    moveend() {
      const c = map.getCenter();
      setCenter([c.lat, c.lng]);
      setZoom(map.getZoom());
      const b = map.getBounds();
      setBounds({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
    },
  });
  return null;
}

function UserLocationMarker() {
  const map = useMap();
  const { latitude, longitude } = useGeolocation();
  const setUserLocation = useAppStore((s) => s.setUserLocation);

  useEffect(() => {
    if (latitude && longitude) {
      map.flyTo([latitude, longitude], 13, { animate: true, duration: 1.5 });
      setUserLocation({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude, map, setUserLocation]);

  if (!latitude || !longitude) return null;

  return (
    <CircleMarker
      center={[latitude, longitude]}
      radius={8}
      pathOptions={{ color: "#0EA5E9", fillColor: "#0EA5E9", fillOpacity: 1, weight: 3 }}
    >
      <Popup>
        <div className="text-sm font-medium">📍 Your Location</div>
        <div className="text-xs text-slate-500">{latitude.toFixed(4)}, {longitude.toFixed(4)}</div>
      </Popup>
    </CircleMarker>
  );
}

function ConflictMarkers({ events, conflictIconClass }: { events: ConflictEvent[]; conflictIconClass: string }) {
  const severityColors: Record<string, string> = {
    critical: "#DC2626",
    high: "#F97316",
    medium: "#F59E0B",
    low: "#3B82F6",
  };

  return (
    <>
      {events.map((e) => {
        const color = severityColors[e.severity] || "#6B7280";
        const icon = createDivIcon("⚠️", color, 28, conflictIconClass);
        return (
          <Marker
            key={e.id}
            position={[e.latitude, e.longitude]}
            icon={icon}
          >
            <Popup maxWidth={280}>
              <div className="text-sm space-y-1">
                <p className="font-bold" style={{ color }}>{e.event_type}</p>
                <p className="text-xs text-slate-500">{e.event_date} · {e.location}</p>
                {e.fatalities > 0 && (
                  <p className="text-xs text-red-600">Fatalities: {e.fatalities}</p>
                )}
                <p className="text-xs">{e.notes?.slice(0, 200)}</p>
                <p className="text-xs text-slate-400">Source: {e.source}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function ReportMarkers({ reports }: { reports: Report[] }) {
  return (
    <>
      {reports.map((r) => {
        const cat = REPORT_CATEGORIES.find((c) => c.id === r.category);
        const icon = createDivIcon(cat?.icon || "📍", cat?.color || "#6B7280", 30);
        const timeAgo = new Date(r.created_at);
        const diffMin = Math.round((Date.now() - timeAgo.getTime()) / 60000);
        const timeStr = diffMin < 60 ? `${diffMin}m ago` : `${Math.round(diffMin / 60)}h ago`;

        return (
          <Marker key={r.id} position={[r.latitude, r.longitude]} icon={icon}>
            <Popup maxWidth={280}>
              <div className="text-sm space-y-1">
                <p className="font-bold">{r.title}</p>
                <p className="text-xs text-slate-500">{cat?.label} · {timeStr}</p>
                {r.description && <p className="text-xs">{r.description}</p>}
                <p className="text-xs text-slate-400">
                  ✓ {r.confirmations} confirmations
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function ThermalLayer({ hotspots }: { hotspots: ThermalHotspot[] }) {
  return (
    <>
      {hotspots.map((h, i) => {
        const radius = Math.min(Math.max(h.frp / 5, 4), 18);
        return (
          <CircleMarker
            key={`firms-${i}-${h.lat}-${h.lng}`}
            center={[h.lat, h.lng]}
            radius={radius}
            pathOptions={{
              color: "#DC2626",
              fillColor: h.confidence === "high" ? "#FF4500" : "#DC2626",
              fillOpacity: 0.55,
              weight: 1,
            }}
          >
            <Popup maxWidth={220}>
              <div className="text-sm space-y-1">
                <p className="font-bold text-red-600">Thermal Anomaly</p>
                <p className="text-xs text-slate-500">{h.acq_date} {h.acq_time}</p>
                <p className="text-xs">Brightness: {h.brightness.toFixed(0)} K</p>
                <p className="text-xs">Fire Power: {h.frp.toFixed(1)} MW</p>
                <p className="text-xs">Confidence: {h.confidence}</p>
                <p className="text-[10px] text-slate-400">Source: NASA FIRMS VIIRS</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function RouteLayer() {
  const { selectedRoute, routes } = useMapStore();

  return (
    <>
      {routes
        .filter((r) => r.id !== selectedRoute?.id)
        .map((route) => (
          <Polyline
            key={route.id}
            positions={route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])}
            pathOptions={{ color: "#94A3B8", weight: 4, opacity: 0.5, dashArray: "10 10" }}
          />
        ))}
      {selectedRoute && (
        <Polyline
          positions={selectedRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])}
          pathOptions={{
            color: safetyScoreColor(selectedRoute.safetyScore),
            weight: 6,
            opacity: 0.85,
          }}
        />
      )}
    </>
  );
}


interface CrisisMapProps {
  onMapClick?: (lat: number, lng: number) => void;
  country?: string;
}

export default function CrisisMap({ country = "Ukraine" }: CrisisMapProps) {
  const { center, zoom, activeLayers, selectedRoute, routes, setViewCountry } = useMapStore();
  const visualMode = useAppStore((s) => s.visualMode);
  const { reports } = useReports();
  const { events } = useConflictData(country);
  const showThermal = visualMode === "blackout" || visualMode === "flir";
  const { hotspots } = useFirmsHotspots(showThermal);

  useEffect(() => {
    setViewCountry(country);
  }, [country, setViewCountry]);

  const conflictIconClass = visualMode === "flir" ? "conflict-marker-flir" : "";

  const defaultCenter: [number, number] = [
    center[0] || MAP_CONFIG.DEFAULT_LAT,
    center[1] || MAP_CONFIG.DEFAULT_LNG,
  ];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={zoom || MAP_CONFIG.DEFAULT_ZOOM}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
      minZoom={MAP_CONFIG.MIN_ZOOM}
      maxZoom={MAP_CONFIG.MAX_ZOOM}
    >
      <TileLayer
        url={MAP_CONFIG.TILE_URL}
        attribution={MAP_CONFIG.ATTRIBUTION}
        maxZoom={19}
      />
      <ZoomControl position="topright" />
      <MapEvents />
      <FlyToHandler />
      <UserLocationMarker />

      {activeLayers.conflictEvents && (
        <ConflictMarkers events={events} conflictIconClass={conflictIconClass} />
      )}
      {activeLayers.reports && <ReportMarkers reports={reports} />}

      {showThermal && hotspots.length > 0 && <ThermalLayer hotspots={hotspots} />}

      {(selectedRoute || routes.length > 0) && <RouteLayer />}
    </MapContainer>
  );
}
