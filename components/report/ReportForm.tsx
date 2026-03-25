"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REPORT_CATEGORIES, REPORT_EXPIRY_HOURS } from "@/lib/constants/report-types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ReportCategory, SeverityLevel } from "@/types/report";
import {
  CheckCircle, ChevronDown, ChevronUp, Send, Loader2,
  MapPin, AlertTriangle, Search, Navigation, X,
} from "lucide-react";

interface ReportFormProps {
  initialLat?: number;
  initialLng?: number;
  onSuccess?: () => void;
}

const SEVERITY_CHIPS: { id: SeverityLevel; label: string; color: string; bg: string }[] = [
  { id: "critical", label: "Critical", color: "text-red-400",    bg: "border-red-500/50 bg-red-500/15" },
  { id: "high",     label: "High",     color: "text-orange-400", bg: "border-orange-500/50 bg-orange-500/15" },
  { id: "medium",   label: "Medium",   color: "text-yellow-400", bg: "border-yellow-500/50 bg-yellow-500/15" },
  { id: "low",      label: "Low",      color: "text-blue-400",   bg: "border-blue-500/50 bg-blue-500/15" },
  { id: "positive", label: "Positive", color: "text-green-400",  bg: "border-green-500/50 bg-green-500/15" },
];

interface GeoResult {
  formatted_address: string;
  lat: number;
  lng: number;
  place_id: string;
  city?: string | null;
  country?: string | null;
}

function getDeviceId() {
  if (typeof localStorage === "undefined") return crypto.randomUUID();
  let id = localStorage.getItem("saferoute_device_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("saferoute_device_id", id); }
  return id;
}

export default function ReportForm({ initialLat, initialLng, onSuccess }: ReportFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(initialLat ?? 0);
  const [lng, setLng] = useState(initialLng ?? 0);
  const [locationName, setLocationName] = useState("");
  const [locating, setLocating] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationSource, setLocationSource] = useState<"gps" | "search" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Location search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const autoLocated = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // GPS location
  const getGPSLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setHasLocation(true);
        setLocationSource("gps");
        setSearchQuery("");
        setLocationName("");
        setLocating(false);
      },
      () => { setLocating(false); },
      { timeout: 6000 }
    );
  }, []);

  // Auto-detect GPS on mount (unless initial coords passed)
  useEffect(() => {
    if (!autoLocated.current) {
      autoLocated.current = true;
      if (initialLat && initialLng) {
        setLat(initialLat);
        setLng(initialLng);
        setHasLocation(true);
        setLocationSource("gps");
      } else {
        getGPSLocation();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Agent-prefilled report
  useEffect(() => {
    const stored = sessionStorage.getItem("agentReport");
    if (stored) {
      sessionStorage.removeItem("agentReport");
      try {
        const data = JSON.parse(stored) as {
          category?: string; severity?: string; title?: string;
          description?: string; lat?: number; lng?: number;
        };
        if (data.category) setSelectedCategory(data.category as ReportCategory);
        if (data.severity) setSeverity(data.severity as SeverityLevel);
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.lat && data.lng) {
          setLat(data.lat); setLng(data.lng);
          setHasLocation(true); setLocationSource("gps");
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced geocode search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/google-geocode?address=${encodeURIComponent(query)}`);
        const data = await res.json() as { results?: GeoResult[] };
        setSearchResults(data.results ?? []);
        setShowResults(true);
      } catch { /* ignore */ } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const selectSearchResult = (result: GeoResult) => {
    setLat(result.lat);
    setLng(result.lng);
    setLocationName(result.formatted_address);
    setHasLocation(true);
    setLocationSource("search");
    setSearchQuery(result.formatted_address);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    if (locationSource === "search") {
      setHasLocation(false);
      setLocationSource(null);
      setLat(0); setLng(0); setLocationName("");
    }
  };

  const handleCategorySelect = (cat: ReportCategory) => {
    const catDef = REPORT_CATEGORIES.find((c) => c.id === cat);
    setSelectedCategory(cat);
    if (catDef) setSeverity(catDef.severity as SeverityLevel);
    setTitle(catDef?.label ?? "");
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    if (!isSupabaseConfigured) {
      setError("Reporting is not configured. Please try again later.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const expiryHours = REPORT_EXPIRY_HOURS[selectedCategory] ?? 480;
      const expiresAt = new Date(Date.now() + expiryHours * 3_600_000).toISOString();
      const reportTitle =
        title.trim() ||
        (REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? selectedCategory);

      const { error: err } = await supabase.from("reports").insert({
        category: selectedCategory,
        severity,
        title: reportTitle,
        description: description.trim() || null,
        latitude: lat,
        longitude: lng,
        location_name: locationName || null,
        reporter_id: getDeviceId(),
        language: localStorage?.getItem("saferoute_language") ?? "en",
        expires_at: expiresAt,
        status: "active",
        confirmations: 0,
        denials: 0,
      });

      if (err) throw err;
      setSuccess(true);
      setTimeout(() => onSuccess?.(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center px-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4"
        >
          <CheckCircle className="w-10 h-10 text-green-400" />
        </motion.div>
        <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
        <p className="text-slate-400 text-sm">Your report will help keep others safe.</p>
      </motion.div>
    );
  }

  const selectedCatDef = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Location section ── */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">
            Location
          </p>

          {/* Search input */}
          <div className="relative" ref={searchRef}>
            <div className="relative flex items-center">
              {searchLoading ? (
                <Loader2 className="absolute left-3 w-4 h-4 text-slate-500 animate-spin" />
              ) : (
                <Search className="absolute left-3 w-4 h-4 text-slate-500" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Search for a location…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal/50 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results dropdown */}
            <AnimatePresence>
              {showResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-[#0d1424] border border-white/12 rounded-xl overflow-hidden z-20 shadow-xl"
                >
                  {searchResults.map((r) => (
                    <button
                      key={r.place_id}
                      onClick={() => selectSearchResult(r)}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/6 transition-colors border-b border-white/6 last:border-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-teal shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-200 leading-snug">{r.formatted_address}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* GPS button + current location display */}
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={getGPSLocation}
              disabled={locating}
              className="flex items-center gap-1.5 text-xs text-teal hover:text-teal/80 transition-colors disabled:opacity-50"
            >
              {locating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Navigation className="w-3 h-3" />
              )}
              {locating ? "Detecting…" : "Use my GPS location"}
            </button>

            {hasLocation && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal/60" />
                {locationSource === "search"
                  ? "Location set"
                  : `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
              </span>
            )}
            {!hasLocation && !locating && (
              <span className="text-[11px] text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                No location set
              </span>
            )}
          </div>
        </div>

        {/* ── Category chips ── */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">
            What are you reporting?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {REPORT_CATEGORIES.map((cat, i) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCategorySelect(cat.id as ReportCategory)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all min-h-[72px] ${
                    isSelected
                      ? "border-teal/60 bg-teal/15 shadow-lg shadow-teal/10"
                      : "border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className={`text-[10px] text-center font-medium leading-tight ${isSelected ? "text-teal" : "text-slate-300"}`}>
                    {cat.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Confirmation + submit ── */}
        <AnimatePresence>
          {selectedCategory && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-[#0d1424] border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Confirmation card */}
              <div className="flex items-center gap-3 p-4 border-b border-white/6">
                <span className="text-2xl">{selectedCatDef?.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{selectedCatDef?.label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {!hasLocation ? (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Set a location above before submitting
                      </span>
                    ) : locationSource === "search" ? (
                      <span className="text-xs text-teal flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                      </span>
                    ) : (
                      <span className="text-xs text-teal flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        GPS: {lat.toFixed(4)}, {lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Severity quick-select */}
              <div className="flex gap-1.5 p-3 overflow-x-auto">
                {SEVERITY_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setSeverity(chip.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      severity === chip.id
                        ? `${chip.bg} ${chip.color}`
                        : "border-white/10 text-slate-500 hover:border-white/20"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Submit button */}
              <div className="px-4 pb-3">
                <motion.button
                  whileHover={{ scale: 1.01, boxShadow: "0 0 20px rgba(220,38,38,0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting || !hasLocation}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all min-h-[52px]"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? "Submitting…" : "Submit Report Now"}
                </motion.button>
              </div>

              {/* Optional details expand */}
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-500 hover:text-slate-300 border-t border-white/6 transition-colors"
              >
                {detailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {detailsOpen ? "Hide details" : "Add details (optional)"}
              </button>

              <AnimatePresence>
                {detailsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/6">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide block mb-1.5">Title</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                          placeholder="Brief description…"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-teal/50 focus:outline-none transition-colors min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide block mb-1.5">Details</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                          placeholder="Additional information…"
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-teal/50 focus:outline-none transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
