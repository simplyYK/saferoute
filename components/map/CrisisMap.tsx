"use client";

import { useEffect, useRef, useState } from "react";
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
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useMapStore, type MapResource } from "@/store/mapStore";
import { useAppStore } from "@/store/appStore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useReports } from "@/hooks/useReports";
import { useConflictData } from "@/hooks/useConflictData";
import { useFirmsHotspots } from "@/hooks/useFirmsHotspots";
import { useResourceLayers } from "@/hooks/useResourceLayers";
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

const RESOURCE_ICONS: Record<string, { emoji: string; color: string }> = {
  hospital:          { emoji: "🏥", color: "#DC2626" },
  clinic:            { emoji: "🩺", color: "#F97316" },
  doctors:           { emoji: "🩺", color: "#F97316" },
  pharmacy:          { emoji: "💊", color: "#22C55E" },
  shelter:           { emoji: "🛖", color: "#3B82F6" },
  community_centre:  { emoji: "🏛", color: "#6366F1" },
  place_of_worship:  { emoji: "⛪", color: "#8B5CF6" },
  school:            { emoji: "🏫", color: "#6366F1" },
  social_facility:   { emoji: "🏠", color: "#3B82F6" },
  police:            { emoji: "🚔", color: "#1E40AF" },
  fire_station:      { emoji: "🚒", color: "#B91C1C" },
  embassy:           { emoji: "🏛️", color: "#7C3AED" },
  water_point:       { emoji: "💧", color: "#06B6D4" },
  drinking_water:    { emoji: "💧", color: "#06B6D4" },
};

/** Returns icon size scaled by zoom level. Smaller at low zoom, larger when zoomed in. */
function iconSizeForZoom(zoom: number, base = 32): number {
  if (zoom <= 8)  return Math.round(base * 0.5);   // 16px — very zoomed out
  if (zoom <= 10) return Math.round(base * 0.6);   // 19px
  if (zoom <= 12) return Math.round(base * 0.75);  // 24px
  if (zoom <= 14) return base;                       // 32px — default
  return Math.round(base * 1.15);                    // 37px — very zoomed in
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
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const setBounds = useMapStore((s) => s.setBounds);
  const map = useMap();
  const lastCenter = useRef<[number, number]>([0, 0]);

  useMapEvents({
    moveend() {
      const c = map.getCenter();
      // Only update store if center moved meaningfully (prevents infinite loop
      // where setCenter triggers re-render which triggers moveend again)
      const dx = Math.abs(c.lat - lastCenter.current[0]);
      const dy = Math.abs(c.lng - lastCenter.current[1]);
      if (dx > 0.0001 || dy > 0.0001) {
        lastCenter.current = [c.lat, c.lng];
        setCenter([c.lat, c.lng]);
        setZoom(map.getZoom());
        const b = map.getBounds();
        setBounds({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
      }
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
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend() { setZoom(map.getZoom()); } });

  const size = iconSizeForZoom(zoom, 28);

  const severityColors: Record<string, string> = {
    critical: "#DC2626",
    high: "#F97316",
    medium: "#F59E0B",
    low: "#3B82F6",
  };
  const severityLabels: Record<string, string> = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MODERATE",
    low: "LOW",
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (!Number.isFinite(diff) || diff < 0) return "";
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "< 1 hour ago";
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  return (
    <>
      {events.map((e) => {
        const color = severityColors[e.severity] || "#6B7280";
        const icon = createDivIcon("⚠️", color, size, conflictIconClass);
        const ago = timeAgo(e.event_date);
        return (
          <Marker
            key={e.id}
            position={[e.latitude, e.longitude]}
            icon={icon}
          >
            <Popup maxWidth={320}>
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: "12px", lineHeight: "1.5", maxWidth: "300px" }}>
                {/* Header: severity badge + event type */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{
                    backgroundColor: color,
                    color: "#fff",
                    fontSize: "9px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    letterSpacing: "0.05em",
                  }}>
                    {severityLabels[e.severity] || "UNKNOWN"}
                  </span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{e.event_type}</span>
                </div>

                {/* Sub-event type */}
                {e.sub_event_type && (
                  <p style={{ color: "#64748b", fontSize: "11px", margin: "0 0 4px" }}>
                    {e.sub_event_type}
                  </p>
                )}

                {/* Location + Date */}
                <p style={{ color: "#475569", fontSize: "11px", margin: "0 0 4px" }}>
                  📍 {e.location}{e.admin1 && e.admin1 !== e.location ? `, ${e.admin1}` : ""}
                  <span style={{ color: "#94a3b8", marginLeft: "6px" }}>{e.event_date}{ago ? ` (${ago})` : ""}</span>
                </p>

                {/* Actors involved */}
                {(e.actor1 || e.actor2) && (
                  <div style={{ background: "#f1f5f9", borderRadius: "6px", padding: "5px 8px", margin: "4px 0", fontSize: "11px" }}>
                    <span style={{ color: "#64748b", fontWeight: 600, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actors</span>
                    <p style={{ color: "#334155", margin: "2px 0 0" }}>{e.actor1}{e.actor2 ? ` vs ${e.actor2}` : ""}</p>
                  </div>
                )}

                {/* Fatalities */}
                {e.fatalities > 0 && (
                  <p style={{ color: "#DC2626", fontWeight: 600, fontSize: "11px", margin: "4px 0" }}>
                    ☠ {e.fatalities} fatalit{e.fatalities === 1 ? "y" : "ies"} reported
                  </p>
                )}
                {e.fatalities === 0 && (
                  <p style={{ color: "#16a34a", fontSize: "11px", margin: "4px 0" }}>
                    No fatalities reported
                  </p>
                )}

                {/* Notes / Description */}
                {e.notes && (
                  <p style={{ color: "#475569", fontSize: "11px", margin: "4px 0", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
                    {e.notes.length > 300 ? e.notes.slice(0, 300) + "…" : e.notes}
                  </p>
                )}

                {/* Source citation */}
                <p style={{ color: "#94a3b8", fontSize: "10px", margin: "6px 0 0", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
                  Source: {e.source || "ACLED"}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// Danger zones: radius circles around critical/high severity conflict events
function DangerZones({ events }: { events: ConflictEvent[] }) {
  const dangerEvents = events.filter((e) => e.severity === "critical" || e.severity === "high");

  const radiusMap: Record<string, number> = {
    critical: 2000, // 2km radius
    high: 1000,     // 1km radius
  };

  return (
    <>
      {dangerEvents.map((e) => (
        <Circle
          key={`dz-${e.id}`}
          center={[e.latitude, e.longitude]}
          radius={radiusMap[e.severity] ?? 1000}
          pathOptions={{
            color: e.severity === "critical" ? "#DC2626" : "#F97316",
            fillColor: e.severity === "critical" ? "#DC2626" : "#F97316",
            fillOpacity: 0.08,
            weight: 1,
            dashArray: "5 5",
          }}
        />
      ))}
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

function ResourceMarkers({ resources }: { resources: MapResource[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() { setZoom(map.getZoom()); },
  });

  const size = iconSizeForZoom(zoom);

  return (
    <>
      {resources.map((r) => {
        const cfg = RESOURCE_ICONS[r.type] || { emoji: "📍", color: "#6B7280" };
        const icon = createDivIcon(cfg.emoji, cfg.color, size);
        return (
          <Marker key={r.id} position={[r.latitude, r.longitude]} icon={icon}>
            <Popup maxWidth={300}>
              <div className="text-sm space-y-1">
                <p className="font-bold">{r.name}</p>
                <p className="text-xs text-slate-500 capitalize">{r.type.replace("_", " ")}</p>
                {r.address && <p className="text-xs text-slate-600">{r.address}</p>}
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="text-xs text-blue-600 block">
                    📞 {r.phone}
                  </a>
                )}
                {r.website && (
                  <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 block">
                    🌐 Website
                  </a>
                )}
                {r.operating_hours && (
                  <p className="text-xs text-slate-500">{r.operating_hours}</p>
                )}
                {r.source && (
                  <p className="text-[10px] text-slate-400">Source: {r.source}</p>
                )}
                <a
                  href={`/route?destLat=${r.latitude}&destLng=${r.longitude}&destName=${encodeURIComponent(r.name)}`}
                  className="inline-flex items-center gap-1 text-xs text-teal font-medium mt-1"
                >
                  🧭 Navigate here
                </a>
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
            <Popup maxWidth={240}>
              <div className="text-sm space-y-1">
                <p className="font-bold text-red-600">Thermal Anomaly</p>
                <p className="text-xs text-slate-500">{h.acq_date} {h.acq_time}</p>
                <p className="text-xs">Brightness: {h.brightness.toFixed(0)} K</p>
                <p className="text-xs">Fire Power: {h.frp.toFixed(1)} MW</p>
                <p className="text-xs">Confidence: {h.confidence}</p>
                <p className="text-[9px] text-slate-500 mt-1 italic">FIRMS detects heat signatures via satellite. In conflict zones, thermal anomalies may indicate fires, explosions, or industrial activity.</p>
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
  const { center, zoom, activeLayers, selectedRoute, routes, setViewCountry, resources } = useMapStore();
  const visualMode = useAppStore((s) => s.visualMode);
  const { reports } = useReports();
  const { events } = useConflictData(country);
  const { hotspots } = useFirmsHotspots(true);
  // Auto-fetch resources when per-type layers are toggled on
  useResourceLayers();

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
      <ZoomControl position="bottomleft" />
      <MapEvents />
      <FlyToHandler />
      <UserLocationMarker />

      {activeLayers.conflictEvents && (
        <ConflictMarkers events={events} conflictIconClass={conflictIconClass} />
      )}
      {activeLayers.reports && <ReportMarkers reports={reports} />}

      {/* Resources: show when generic resources OR any per-type layer is on */}
      {(activeLayers.resources || activeLayers.hospitals || activeLayers.pharmacies || activeLayers.shelters || activeLayers.police || activeLayers.water) && resources.length > 0 && (
        <ResourceMarkers resources={
          activeLayers.resources
            ? resources
            : resources.filter((r) => {
                if (activeLayers.hospitals && (r.type === "hospital" || r.type === "clinic" || r.type === "doctors")) return true;
                if (activeLayers.pharmacies && r.type === "pharmacy") return true;
                if (activeLayers.shelters && (r.type === "shelter" || r.type === "community_centre" || r.type === "place_of_worship" || r.type === "school" || r.type === "fire_station" || r.type === "social_facility")) return true;
                if (activeLayers.police && r.type === "police") return true;
                if (activeLayers.water && (r.type === "water_point" || r.type === "drinking_water")) return true;
                return false;
              })
        } />
      )}

      {/* Danger zones: buffer circles around critical conflict events */}
      {activeLayers.dangerZones && events.length > 0 && (
        <DangerZones events={events} />
      )}

      {/* Thermal hotspots: shown when dangerZones layer is on */}
      {activeLayers.dangerZones && hotspots.length > 0 && (
        <ThermalLayer hotspots={hotspots} />
      )}

      {(selectedRoute || routes.length > 0) && <RouteLayer />}
    </MapContainer>
  );
}
