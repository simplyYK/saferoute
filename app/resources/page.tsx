"use client";
import { useState, useEffect } from "react";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import { RESOURCE_TYPES } from "@/lib/constants/resource-types";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getBoundingBox, haversineDistance, formatDistance } from "@/lib/utils/geo";
import type { Resource } from "@/types/resource";
import { Phone, Globe, Navigation, CheckCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
  unknown: "bg-slate-100 text-slate-600",
  overcrowded: "bg-yellow-100 text-yellow-700",
  limited_service: "bg-orange-100 text-orange-700",
};

export default function ResourcesPage() {
  const { latitude, longitude } = useGeolocation();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!latitude || !longitude) return;
    const fetchResources = async () => {
      setLoading(true);
      try {
        const types = filter === "all"
          ? ["hospital", "clinic", "pharmacy", "shelter", "police", "water_point", "embassy"]
          : [filter];

        const bbox = getBoundingBox(latitude, longitude, 25);
        const results = await Promise.all(
          types.map((type) =>
            fetch(`/api/overpass?type=${type}&south=${bbox.south}&west=${bbox.west}&north=${bbox.north}&east=${bbox.east}`)
              .then((r) => r.json())
              .then((d) => d.resources || [])
              .catch(() => [])
          )
        );

        const flat: Resource[] = results.flat();
        // Add distances and sort
        const withDist = flat
          .map((r) => ({
            ...r,
            distance_km: haversineDistance(latitude, longitude, r.latitude, r.longitude),
          }))
          .sort((a, b) => (a.distance_km || 99) - (b.distance_km || 99))
          .slice(0, 50);

        setResources(withDist);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [latitude, longitude, filter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-slate-900">Emergency Resources</h1>
            <p className="text-sm text-slate-500 mt-1">Hospitals, shelters, water, and aid near you</p>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            <button
              onClick={() => setFilter("all")}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border-2 font-medium min-h-[36px] transition-colors ${
                filter === "all" ? "border-teal bg-teal/10 text-teal" : "border-slate-200 text-slate-600"
              }`}
            >
              All
            </button>
            {RESOURCE_TYPES.slice(0, 8).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border-2 font-medium min-h-[36px] transition-colors ${
                  filter === t.id ? "border-teal bg-teal/10 text-teal" : "border-slate-200 text-slate-600"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {!latitude && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700 mb-4">
              📍 Allow location access to find resources near you
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {resources.map((r) => {
              const typeDef = RESOURCE_TYPES.find((t) => t.id === r.type);
              return (
                <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{typeDef?.icon || "📍"}</span>
                      <div>
                        <p className="font-semibold text-sm">{r.name}</p>
                        {r.address && <p className="text-xs text-slate-500">{r.address}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[r.status] || STATUS_COLORS.unknown}`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {r.distance_km && (
                      <span className="text-xs text-slate-500">📍 {formatDistance(r.distance_km)}</span>
                    )}
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-xs text-blue-600">
                        <Phone className="w-3 h-3" />
                        {r.phone}
                      </a>
                    )}
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600">
                        <Globe className="w-3 h-3" />
                        Website
                      </a>
                    )}
                    {r.verified && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                    <a
                      href={`/route?destLat=${r.latitude}&destLng=${r.longitude}&destName=${encodeURIComponent(r.name)}`}
                      className="flex items-center gap-1 text-xs text-teal font-medium ml-auto"
                    >
                      <Navigation className="w-3 h-3" />
                      Navigate
                    </a>
                  </div>
                </div>
              );
            })}
            {!loading && resources.length === 0 && latitude && (
              <p className="text-center text-slate-400 py-8">No resources found in your area.</p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
