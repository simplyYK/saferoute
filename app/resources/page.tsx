"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineDistance, formatDistance } from "@/lib/utils/geo";
import type { Resource } from "@/types/resource";
import { Phone, Globe, Navigation, Loader2, MapPin } from "lucide-react";

const ResourcesMap = dynamic(() => import("@/components/resources/ResourcesMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-xl bg-slate-200 animate-pulse flex items-center justify-center text-slate-500 text-sm">
      Loading map…
    </div>
  ),
});

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
  unknown: "bg-slate-100 text-slate-600",
  overcrowded: "bg-yellow-100 text-yellow-700",
  limited_service: "bg-orange-100 text-orange-700",
};

type Chip = "all" | "medical" | "shelter" | "pharmacy" | "water" | "safety";

const CHIPS: { id: Chip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "medical", label: "🏥 Medical" },
  { id: "shelter", label: "🏠 Shelter" },
  { id: "pharmacy", label: "💊 Pharmacy" },
  { id: "water", label: "💧 Water" },
  { id: "safety", label: "👮 Safety" },
];

const UA = { "User-Agent": "SafeRoute/1.0 (crisis navigation)" };

function chipMatch(r: Resource, chip: Chip): boolean {
  if (chip === "all") return true;
  if (chip === "medical") return r.type === "hospital";
  if (chip === "shelter") return r.type === "shelter";
  if (chip === "pharmacy") return r.type === "pharmacy";
  if (chip === "water") return r.type === "water_point";
  if (chip === "safety") return r.type === "police_station" || r.type === "fire_station";
  return true;
}

function typeIcon(type: Resource["type"]) {
  const map: Partial<Record<Resource["type"], string>> = {
    hospital: "🏥",
    shelter: "🏠",
    pharmacy: "💊",
    water_point: "💧",
    police_station: "👮",
    fire_station: "🚒",
  };
  return map[type] || "📍";
}

export default function ResourcesPage() {
  const geo = useGeolocation();
  const [manualLat, setManualLat] = useState<number | null>(null);
  const [manualLng, setManualLng] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Chip>("all");

  const lat = manualLat ?? geo.latitude ?? null;
  const lng = manualLng ?? geo.longitude ?? null;
  const hasCoords = lat != null && lng != null;

  const applySearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearchBusy(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ.trim())}&format=json&limit=1`,
        { headers: UA }
      );
      const data = (await res.json()) as { lat?: string; lon?: string }[];
      const hit = data[0];
      if (hit?.lat && hit?.lon) {
        setManualLat(parseFloat(hit.lat));
        setManualLng(parseFloat(hit.lon));
      }
    } finally {
      setSearchBusy(false);
    }
  }, [searchQ]);

  useEffect(() => {
    if (!hasCoords) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/overpass?lat=${lat}&lng=${lng}`);
        const json = (await res.json()) as { resources?: Resource[] };
        if (!cancelled) setResources(Array.isArray(json.resources) ? json.resources : []);
      } catch {
        if (!cancelled) setResources([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng, hasCoords]);

  const withDistance = useMemo(() => {
    if (!hasCoords) return [];
    return resources
      .map((r) => ({
        ...r,
        distance_km: haversineDistance(lat!, lng!, r.latitude, r.longitude),
      }))
      .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  }, [resources, lat, lng, hasCoords]);

  const filtered = useMemo(
    () => withDistance.filter((r) => chipMatch(r, filter)),
    [withDistance, filter]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto p-4 w-full">
          <div className="mb-3">
            <h1 className="text-xl font-bold text-slate-900">Emergency resources</h1>
            <p className="text-sm text-slate-500 mt-1">
              Hospitals, shelters, water, and safety services within 5 km (OSM)
            </p>
          </div>

          {!hasCoords && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 mb-3 space-y-2">
              <p>Allow location or search for an area to load nearby resources.</p>
              <div className="flex gap-2">
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void applySearch()}
                  placeholder="City or address…"
                  className="flex-1 min-w-0 border border-amber-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => void applySearch()}
                  disabled={searchBusy}
                  className="shrink-0 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {searchBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {hasCoords && (
            <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-200 mb-4 shadow-sm">
              <ResourcesMap userLat={lat!} userLng={lng!} resources={filtered} />
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
            {CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={`shrink-0 text-xs px-3 py-2 rounded-full border-2 font-medium min-h-[40px] whitespace-nowrap transition-colors ${
                  filter === c.id
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-slate-200 text-slate-600 bg-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-slate-100" />
              ))}
            </div>
          )}

          <div className="space-y-3 pb-4">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 w-full"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{typeIcon(r.type)}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{r.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {r.type.replace(/_/g, " ")}
                      </p>
                      {r.address && (
                        <p className="text-xs text-slate-400 truncate">{r.address}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[r.status] || STATUS_COLORS.unknown}`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                  {r.distance_km != null && (
                    <span className="text-slate-600 font-medium">
                      {formatDistance(r.distance_km)}
                    </span>
                  )}
                  {r.operating_hours && (
                    <span className="text-slate-500">🕐 {r.operating_hours}</span>
                  )}
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-blue-600 min-h-[44px] sm:min-h-0 py-2 sm:py-0">
                      <Phone className="w-3 h-3 shrink-0" />
                      {r.phone}
                    </a>
                  )}
                  {r.website && (
                    <a
                      href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 min-h-[44px] sm:min-h-0 py-2 sm:py-0"
                    >
                      <Globe className="w-3 h-3 shrink-0" />
                      Website
                    </a>
                  )}
                  <a
                    href={`https://maps.google.com/?daddr=${r.latitude},${r.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-teal font-semibold ml-auto min-h-[44px] px-2 py-2 rounded-lg bg-teal/10 border border-teal/30"
                  >
                    <Navigation className="w-3 h-3 shrink-0" />
                    Navigate
                  </a>
                </div>
              </div>
            ))}
            {!loading && hasCoords && filtered.length === 0 && (
              <p className="text-center text-slate-400 py-8">No resources match this filter.</p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
