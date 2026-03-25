"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { MAP_CONFIG } from "@/lib/constants/map-config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng, map]);
  return null;
}

export default function ReportLocationMap({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng) && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001);
  const cLat = hasPin ? lat : MAP_CONFIG.DEFAULT_LAT;
  const cLng = hasPin ? lng : MAP_CONFIG.DEFAULT_LNG;

  return (
    <div className="h-40 w-full rounded-xl overflow-hidden border border-slate-200">
      <MapContainer
        center={[cLat, cLng]}
        zoom={hasPin ? 16 : 11}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer url={MAP_CONFIG.TILE_URL} attribution={MAP_CONFIG.ATTRIBUTION} maxZoom={19} />
        {hasPin && (
          <>
            <Recenter lat={lat} lng={lng} />
            <Marker position={[lat, lng]} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
