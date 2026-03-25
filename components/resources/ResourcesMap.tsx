"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { MAP_CONFIG } from "@/lib/constants/map-config";
import type { Resource } from "@/types/resource";
import { RESOURCE_TYPES } from "@/lib/constants/resource-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function iconFor(type: string) {
  const def = RESOURCE_TYPES.find((t) => t.id === type);
  const emoji = def?.icon || "📍";
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:${def?.color || "#0EA5E9"};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid white">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

export default function ResourcesMap({
  userLat,
  userLng,
  resources,
}: {
  userLat: number;
  userLng: number;
  resources: Resource[];
}) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={13}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
      className="rounded-xl z-0"
    >
      <TileLayer url={MAP_CONFIG.TILE_URL} attribution={MAP_CONFIG.ATTRIBUTION} maxZoom={19} />
      <Recenter lat={userLat} lng={userLng} />
      <CircleMarker
        center={[userLat, userLng]}
        radius={10}
        pathOptions={{ color: "#0EA5E9", fillColor: "#0EA5E9", fillOpacity: 1, weight: 2 }}
      >
        <Popup>You are here</Popup>
      </CircleMarker>
      {resources.map((r) => (
        <Marker
          key={r.id}
          position={[r.latitude, r.longitude]}
          icon={iconFor(r.type)}
        >
          <Popup>
            <div className="text-sm font-medium">{r.name}</div>
            <div className="text-xs text-slate-600">{r.type.replace("_", " ")}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
