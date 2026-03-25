"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GripHorizontal, Loader2, Phone, Navigation, Heart, MapPin } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import { useRouter } from "next/navigation";

interface Resource {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  distance?: number;
  status?: string;
}

const TYPE_ICONS: Record<string, string> = {
  hospital: "🏥",
  clinic: "🩺",
  pharmacy: "💊",
  shelter: "🏠",
  police: "🚔",
  fire_station: "🚒",
  embassy: "🏛️",
  water_point: "💧",
};

const TYPE_LABELS: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  pharmacy: "Pharmacy",
  shelter: "Shelter",
  police: "Police",
  fire_station: "Fire Station",
  embassy: "Embassy",
  water_point: "Water",
};

const STATUS_COLORS: Record<string, string> = {
  open: "text-green-400",
  closed: "text-red-400",
  overcrowded: "text-orange-400",
  limited_service: "text-yellow-400",
  unknown: "text-slate-500",
};

interface ResourceSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function ResourceSheet({ open, onClose }: ResourceSheetProps) {
  const userLocation = useAppStore((s) => s.userLocation);
  const { addResources, toggleLayer, activeLayers, flyTo } = useMapStore();
  const router = useRouter();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    if (!userLocation) {
      setError("Enable location access to find nearby resources.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const radius = 0.25;
      const types = ["hospital", "shelter", "pharmacy", "police"];
      const results: Resource[] = [];

      await Promise.all(
        types.map(async (type) => {
          try {
            const res = await fetch(
              `/api/overpass?type=${type}&south=${userLocation.lat - radius}&north=${userLocation.lat + radius}&west=${userLocation.lng - radius}&east=${userLocation.lng + radius}`
            );
            const data = await res.json() as { resources?: Resource[] };
            const items = (data.resources ?? []).map((r) => ({
              ...r,
              type,
              distance: Math.hypot(r.latitude - userLocation.lat, r.longitude - userLocation.lng) * 111,
            }));
            results.push(...items);
          } catch { /* ignore individual failures */ }
        })
      );

      // Sort by distance
      results.sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));
      setResources(results);

      // Push to map store
      const mapResources = results.map((r, i) => ({
        id: `sheet-resource-${i}`,
        name: r.name,
        type: r.type as "hospital" | "shelter" | "pharmacy" | "police" | "water_point" | "embassy" | "clinic" | "fire_station",
        latitude: r.latitude,
        longitude: r.longitude,
        address: r.address,
        phone: r.phone,
        status: r.status as "open" | "closed" | "unknown" | "overcrowded" | "limited_service" | undefined,
      }));
      addResources(mapResources);
      if (!activeLayers.resources) toggleLayer("resources");
    } catch {
      setError("Failed to load resources. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userLocation, addResources, toggleLayer, activeLayers.resources]);

  useEffect(() => {
    if (open && resources.length === 0 && !loading) {
      void fetchResources();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "hospital", label: "🏥 Hospital" },
    { id: "shelter", label: "🏠 Shelter" },
    { id: "pharmacy", label: "💊 Pharmacy" },
    { id: "police", label: "🚔 Police" },
  ];

  const filtered = filter === "all" ? resources : resources.filter((r) => r.type === filter);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[901] bg-[#0d1424] rounded-t-3xl shadow-2xl border-t border-white/8 flex flex-col"
            style={{ height: "72vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Nearby Resources</p>
                  <p className="text-[10px] text-slate-400">
                    {loading ? "Searching…" : `${resources.length} found within 25km`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GripHorizontal className="w-4 h-4 text-slate-600" />
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 px-5 pb-3 overflow-x-auto shrink-0 scrollbar-hide">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                    filter === f.id
                      ? "border-teal/50 bg-teal/15 text-teal"
                      : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-20 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-sm">Searching nearby resources…</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                  <MapPin className="w-6 h-6" />
                  <p className="text-sm text-center">{error}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                  <Heart className="w-6 h-6" />
                  <p className="text-sm text-center">No resources found nearby</p>
                </div>
              ) : (
                filtered.map((resource, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white/4 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl shrink-0 mt-0.5">
                        {TYPE_ICONS[resource.type] ?? "📍"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-white truncate">{resource.name}</p>
                            <p className="text-xs text-slate-400">{TYPE_LABELS[resource.type] ?? resource.type}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {resource.distance != null && (
                              <span className="text-xs text-teal font-medium">
                                {resource.distance < 1
                                  ? `${Math.round(resource.distance * 1000)}m`
                                  : `${resource.distance.toFixed(1)}km`}
                              </span>
                            )}
                            {resource.status && (
                              <span className={`text-[10px] font-medium capitalize ${STATUS_COLORS[resource.status] ?? "text-slate-500"}`}>
                                {resource.status.replace("_", " ")}
                              </span>
                            )}
                          </div>
                        </div>

                        {resource.address && (
                          <p className="text-xs text-slate-500 mt-1 truncate">{resource.address}</p>
                        )}

                        <div className="flex gap-2 mt-2.5">
                          {resource.phone && (
                            <a
                              href={`tel:${resource.phone}`}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                              Call
                            </a>
                          )}
                          <button
                            onClick={() => flyTo([resource.latitude, resource.longitude])}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-medium hover:bg-white/10 transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-teal" />
                            View
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              router.push(
                                `/route?destLat=${resource.latitude}&destLng=${resource.longitude}&destName=${encodeURIComponent(resource.name)}`
                              );
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal/10 border border-teal/20 text-teal text-xs font-medium hover:bg-teal/20 transition-colors"
                          >
                            <Navigation className="w-3 h-3" />
                            Navigate
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
