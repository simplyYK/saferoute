"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import { useReports } from "@/hooks/useReports";
import { useFlights } from "@/hooks/useFlights";
import { useSeismic } from "@/hooks/useSeismic";
import { useSatellites } from "@/hooks/useSatellites";
import { useConflictData } from "@/hooks/useConflictData";
import { useResolvedCountry } from "@/hooks/useResolvedCountry";
import { useWeather } from "@/hooks/useWeather";
import { useConflictStats } from "@/hooks/useConflictStats";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import {
  Plane, Activity, AlertTriangle, Satellite, FileText,
  Loader2, ChevronDown, Globe, LayoutDashboard, X,
  TrendingUp, Radio, Crosshair, Zap, CloudSun, BarChart3
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Citation } from "@/components/shared/Citation";
import CountryDeepDive from "@/components/intel/CountryDeepDive";
import type { ConflictPointFeature } from "@/components/globe/IntelligenceGlobe";

const IntelligenceGlobe = dynamic(
  () => import("@/components/globe/IntelligenceGlobe"),
  { ssr: false }
);

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color, alert, delay, trend, citation, loading
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  alert?: boolean;
  delay?: number;
  trend?: string;
  citation?: string;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, type: "spring", stiffness: 300, damping: 28 }}
      className={`relative rounded-2xl border p-4 overflow-hidden ${
        alert
          ? "border-red-500/40 bg-red-500/8"
          : "border-white/8 bg-white/4"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-start justify-between mb-2">
        <div className={`p-1.5 rounded-lg bg-white/5`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {alert && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-full animate-pulse">
            ALERT
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2 mt-1">
          <div className="h-7 w-16 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {trend && (
              <span className="text-[10px] font-semibold text-slate-400">{trend}</span>
            )}
          </div>
          <p className="text-xs text-white font-medium mt-0.5">{label}</p>
          {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
        </>
      )}
      {citation && <Citation source={citation} />}
    </motion.div>
  );
}

// ─── Intelligence Feed Item ───────────────────────────────────────
function IntelItem({ icon: Icon, title, detail, severity, delay }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  severity: "critical" | "high" | "normal";
  delay?: number;
}) {
  const colors = {
    critical: { dot: "bg-red-500", text: "text-red-400", border: "border-red-500/20" },
    high: { dot: "bg-orange-400", text: "text-orange-400", border: "border-orange-500/20" },
    normal: { dot: "bg-teal", text: "text-teal", border: "border-teal/10" },
  };
  const c = colors[severity];
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay ?? 0 }}
      className={`flex items-start gap-3 py-3 border-b ${c.border} last:border-0`}
    >
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${c.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
    </motion.div>
  );
}

// ─── SITREP Modal ─────────────────────────────────────────────────
function SitrepModal({ open, onClose, conflictCount, reportCount, seismicCount, flightCount, milCount, viewCountry, conflicts, reports, seismic }: {
  open: boolean; onClose: () => void;
  conflictCount: number; reportCount: number;
  seismicCount: number; flightCount: number; milCount: number;
  viewCountry: string;
  conflicts: { severity?: string }[];
  reports: { severity?: string }[];
  seismic: { magnitude: number }[];
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText("");
    setLoading(true);
    const prompt = `Generate a concise military-style SITREP for Sentinel crisis platform.
Region: ${viewCountry}
Live data: ${conflictCount} conflict events (${conflicts.filter((e) => e.severity === "critical").length} critical), ${reportCount} community reports (${reports.filter((r) => r.severity === "critical").length} critical), ${seismicCount} seismic events last 24h (${seismic.filter((e) => e.magnitude >= 4.0).length} M4+), ${flightCount} commercial + ${milCount} military aircraft tracked.
Format: THREAT LEVEL · SITUATION SUMMARY · KEY OBSERVATIONS · RECOMMENDED ACTIONS FOR CIVILIANS. Under 200 words. Be direct and tactical. Make it actionable for a civilian in the region.`;
    void (async () => {
      try {
        const res = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
        });
        const reader = res.body?.getReader();
        const dec = new TextDecoder();
        let full = "";
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of dec.decode(value, { stream: true }).split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const d = line.slice(6);
              if (d === "[DONE]") continue;
              try { const p = JSON.parse(d) as { content?: string }; if (p.content) { full += p.content; setText(full); } } catch { /* skip */ }
            }
          }
        }
      } catch { setText("SITREP generation failed. Check AI configuration."); }
      finally { setLoading(false); }
    })();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed inset-x-4 top-[10%] z-[2001] max-w-lg mx-auto bg-[#0d1424] border border-teal/20 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal" />
                <span className="font-bold text-white tracking-wide text-sm">SITREP</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Auto-generated · Not operational</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {loading && !text ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating intelligence report…
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none text-slate-200 [&_strong]:text-teal [&_p]:text-slate-300">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// TODO P2: UNOCHA ReliefWeb API integration — humanitarian situation data
// TODO P2: Conflict heat map layer on globe view
// TODO P2: Border crossing status indicators

// ─── Main Intel Page ──────────────────────────────────────────────
export default function IntelPage() {
  const viewCountry = useMapStore((s) => s.viewCountry);
  const { country: resolvedCountry, iso3: resolvedIso3, resolving: countryResolving } = useResolvedCountry();
  const effectiveCountry = viewCountry === "My Location" ? resolvedCountry : viewCountry;
  const layers = useMapStore((s) => s.globeLayers);
  const toggleGlobeLayer = useMapStore((s) => s.toggleGlobeLayer);

  const { reports } = useReports();
  const { events: conflicts, loading: conflictsLoading } = useConflictData(effectiveCountry);
  const { stats: conflictStats, loading: statsLoading } = useConflictStats(effectiveCountry);
  const { commercial, military, loading: flightsLoading } = useFlights(true);
  const { events: seismic, loading: seismicLoading } = useSeismic(true);
  const { satellites } = useSatellites(layers.satellites);
  const { weather, loading: weatherLoading } = useWeather();

  const [view, setView] = useState<"dashboard" | "globe">("dashboard");
  const [sitrepOpen, setSitrepOpen] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);

  // Build conflict features for the globe view
  const conflictFeatures = useMemo((): ConflictPointFeature[] => {
    return conflicts.map((c) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [c.longitude, c.latitude] as [number, number],
      },
      properties: {
        event_type: c.event_type,
        severity: c.severity,
        location: c.location,
        fatalities: c.fatalities,
      },
    }));
  }, [conflicts]);

  const milAlert = military.length > 0;
  const seismicAlert = seismic.filter((e) => e.magnitude >= 4.0).length > 0;

  // Build intelligence feed items
  const feedItems = useMemo(() => {
    const items: { icon: React.ComponentType<{ className?: string }>; title: string; detail: string; severity: "critical" | "high" | "normal" }[] = [];

    if (milAlert) {
      items.push({ icon: Plane, title: `${military.length} Military Aircraft Tracked`, detail: "Active military aviation detected in region — potential threat indicator", severity: "critical" });
    }
    if (seismicAlert) {
      const strong = seismic.filter((e) => e.magnitude >= 4.0);
      items.push({ icon: Activity, title: `M${strong[0]?.magnitude.toFixed(1)} Seismic Event`, detail: "Strong seismic activity — may indicate artillery or natural hazard", severity: "high" });
    }
    if (conflicts.filter((e) => e.severity === "critical").length > 0) {
      items.push({ icon: AlertTriangle, title: `${conflicts.filter((e) => e.severity === "critical").length} Critical Conflict Events`, detail: `Active armed conflict recorded in ${effectiveCountry}`, severity: "critical" });
    }
    if (commercial.length > 0) {
      items.push({ icon: Plane, title: `${commercial.length} Commercial Flights Active`, detail: "Civilian airspace operational — no immediate closure", severity: "normal" });
    }
    if (reports.length > 0) {
      items.push({ icon: Radio, title: `${reports.length} Community Reports`, detail: "Crowdsourced intel from field reporters", severity: reports.filter((r) => r.severity === "critical").length > 0 ? "high" : "normal" });
    }
    return items.slice(0, 6);
  }, [military, seismic, conflicts, commercial, reports, milAlert, seismicAlert, effectiveCountry]);

  const GLOBE_LAYERS = [
    { key: "conflict" as const, label: "Conflict Events", icon: AlertTriangle, color: "text-red-400" },
    { key: "reports" as const, label: "Community Reports", icon: Radio, color: "text-yellow-400" },
    { key: "flights" as const, label: "Commercial Flights", icon: Plane, color: "text-blue-400" },
    { key: "military" as const, label: "Military Aircraft", icon: Crosshair, color: "text-red-500" },
    { key: "seismic" as const, label: "Seismic Activity", icon: Activity, color: "text-orange-400" },
    { key: "satellites" as const, label: "Satellites", icon: Satellite, color: "text-purple-400" },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1e] overflow-hidden">
      <TopBar />

      <div className="flex-1 mt-14 mb-14 flex flex-col overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-white/6 shrink-0 gap-2">
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
              THREAT INTEL — <span className="text-teal">{effectiveCountry.toUpperCase()}</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider hidden sm:block">Live multi-source fusion</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-white/5 border border-white/8 rounded-xl p-0.5">
              <button
                onClick={() => setView("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === "dashboard" ? "bg-teal/20 text-teal" : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-3 h-3" />
                <span className="hidden sm:block">Dashboard</span>
              </button>
              <button
                onClick={() => setView("globe")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === "globe" ? "bg-teal/20 text-teal" : "text-slate-400 hover:text-white"
                }`}
              >
                <Globe className="w-3 h-3" />
                <span className="hidden sm:block">3D Globe</span>
              </button>
            </div>
            {/* Country Deep Dive */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setDeepDiveOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-all"
            >
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline">Deep Dive</span>
            </motion.button>
            {/* SITREP */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSitrepOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal/10 border border-teal/25 text-teal text-xs font-semibold hover:bg-teal/20 transition-all"
            >
              <Zap className="w-3 h-3" />
              SITREP
            </motion.button>
          </div>
        </div>

        {/* Dashboard view */}
        <AnimatePresence mode="wait">
          {view === "dashboard" ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {/* Alert banner */}
              {(milAlert || seismicAlert) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                  <p className="text-sm text-red-300 font-medium">
                    {milAlert ? `${military.length} military aircraft active` : ""}
                    {milAlert && seismicAlert ? " · " : ""}
                    {seismicAlert ? "Strong seismic detected" : ""}
                    {" — elevated threat level"}
                  </p>
                </motion.div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={AlertTriangle}
                  label="Conflict Events"
                  value={conflictStats?.summary.latestCompleteMonth?.events ?? conflictStats?.summary.latestMonth?.events ?? conflicts.length}
                  sub={conflictStats?.summary.latestCompleteMonth ? `${effectiveCountry} · ${conflictStats.summary.latestCompleteMonth.month}` : `${effectiveCountry} · Last 30d`}
                  color="text-red-400"
                  alert={(conflictStats?.summary.latestCompleteMonth?.fatalities ?? 0) > 0 || conflicts.filter((e) => e.severity === "critical").length > 0}
                  trend={conflictStats?.summary.trend ? `${conflictStats.summary.trend.direction === "increasing" ? "↑" : conflictStats.summary.trend.direction === "decreasing" ? "↓" : "→"} ${Math.abs(conflictStats.summary.trend.percentChange)}% vs prev month` : conflicts.length > 0 ? `${conflicts.filter((e) => e.severity === "critical").length} critical` : undefined}
                  delay={0}
                  citation="ACLED via HDX"
                  loading={conflictsLoading && statsLoading}
                />
                <StatCard
                  icon={Plane}
                  label="Military Aircraft"
                  value={military.length}
                  sub="Live ADS-B tracking"
                  color="text-orange-400"
                  alert={milAlert}
                  trend={milAlert ? "↑ Active" : "— Clear"}
                  delay={0.06}
                  citation="OpenSky"
                  loading={flightsLoading}
                />
                <div className="relative rounded-2xl border p-4 overflow-hidden border-white/8 bg-white/4">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <Activity className="w-4 h-4 text-yellow-400" />
                    </div>
                    {seismicAlert && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-full animate-pulse">ALERT</span>
                    )}
                  </div>
                  {seismicLoading ? (
                    <div className="space-y-2 mt-1">
                      <div className="h-7 w-16 bg-white/5 rounded-lg animate-pulse" />
                      <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-yellow-400">{seismic.length}</p>
                      <p className="text-xs text-white font-medium mt-0.5">Seismic Events</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Last 24h · All magnitudes</p>
                      {/* Magnitude breakdown legend */}
                      <div className="mt-2 space-y-0.5">
                        {[
                          { range: "M6+", color: "bg-red-700", label: "Major", count: seismic.filter((e) => e.magnitude >= 6).length },
                          { range: "M5-6", color: "bg-red-500", label: "Strong", count: seismic.filter((e) => e.magnitude >= 5 && e.magnitude < 6).length },
                          { range: "M4-5", color: "bg-orange-500", label: "Moderate", count: seismic.filter((e) => e.magnitude >= 4 && e.magnitude < 5).length },
                          { range: "M3-4", color: "bg-yellow-500", label: "Light", count: seismic.filter((e) => e.magnitude >= 3 && e.magnitude < 4).length },
                          { range: "M2-3", color: "bg-blue-400", label: "Minor", count: seismic.filter((e) => e.magnitude >= 2 && e.magnitude < 3).length },
                        ].filter((b) => b.count > 0).map((b) => (
                          <div key={b.range} className="flex items-center gap-1.5 text-[9px]">
                            <span className={`w-2 h-2 rounded-full ${b.color} shrink-0`} />
                            <span className="text-slate-400 w-8">{b.range}</span>
                            <span className="text-slate-500">{b.label}</span>
                            <span className="text-slate-300 ml-auto font-medium">{b.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <Citation source="USGS" />
                </div>
                <StatCard
                  icon={Radio}
                  label="Field Reports"
                  value={reports.length}
                  sub="Community intel"
                  color="text-teal"
                  trend={reports.filter((r) => r.severity === "critical").length > 0 ? `${reports.filter((r) => r.severity === "critical").length} critical` : undefined}
                  delay={0.18}
                  citation="Community"
                />
                <StatCard
                  icon={CloudSun}
                  label="Weather"
                  value={weather ? `${Math.round(weather.temperature)}°` : "—"}
                  sub={weather ? `${weather.condition} · Wind ${weather.windSpeed} km/h` : "Fetching..."}
                  loading={weatherLoading}
                  color="text-sky-400"
                  trend={weather ? `Vis ${weather.visibility >= 1000 ? `${(weather.visibility / 1000).toFixed(1)}km` : `${weather.visibility}m`}` : undefined}
                  delay={0.24}
                  citation="Open-Meteo"
                />
                <StatCard
                  icon={TrendingUp}
                  label={conflictStats ? "Fatalities" : "Critical Reports"}
                  value={conflictStats?.summary.latestCompleteMonth?.fatalities ?? reports.filter((r) => r.severity === "critical" || r.severity === "high").length}
                  sub={conflictStats?.summary.latestCompleteMonth ? `${conflictStats.summary.latestCompleteMonth.month} · ${effectiveCountry}` : "High-severity only"}
                  color="text-red-400"
                  alert={(conflictStats?.summary.latestCompleteMonth?.fatalities ?? 0) > 50}
                  delay={0.3}
                  citation={conflictStats ? "ACLED via HDX" : "Community"}
                  loading={statsLoading}
                />
              </div>

              {/* Real ACLED Conflict Data — Top Affected Regions */}
              {conflictStats && conflictStats.topRegions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white/3 border border-white/6 rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Most Affected Regions</p>
                    <span className="text-[9px] text-slate-600 ml-auto">Source: ACLED via HDX</span>
                  </div>
                  <div className="px-4 py-2 space-y-1.5">
                    {conflictStats.topRegions.slice(0, 6).map((r, i) => {
                      const maxEvents = conflictStats.topRegions[0]?.events || 1;
                      const pct = Math.min((r.events / maxEvents) * 100, 100);
                      return (
                        <div key={r.name} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-300 font-medium truncate max-w-[180px]">{r.name}</span>
                            <span className="text-slate-400">{r.events.toLocaleString()} events · {r.fatalities.toLocaleString()} killed</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                              className="h-full rounded-full bg-red-500/60"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Intelligence feed */}
              {feedItems.length === 0 && (
                <div className="bg-white/3 border border-white/6 rounded-2xl p-8 text-center">
                  <Activity className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No intelligence events detected</p>
                  <p className="text-xs text-slate-500 mt-1">Monitoring {effectiveCountry} · Data refreshes automatically</p>
                </div>
              )}
              {feedItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white/3 border border-white/6 rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6">
                    <div className="w-1.5 h-1.5 bg-teal rounded-full animate-pulse" />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Intelligence Feed</p>
                  </div>
                  <div className="px-4 divide-y divide-white/4">
                    {feedItems.map((item, i) => (
                      <IntelItem key={i} {...item} delay={0.35 + i * 0.04} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Layer toggles for globe */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/3 border border-white/6 rounded-2xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-white/6">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Globe Layer Controls</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Toggle what shows on the 3D view</p>
                </div>
                <div className="p-3 grid grid-cols-2 gap-1.5">
                  {GLOBE_LAYERS.map(({ key, label, icon: Icon, color }) => {
                    const active = layers[key];
                    return (
                      <button
                        key={key}
                        onClick={() => toggleGlobeLayer(key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                          active
                            ? `border-current/30 bg-white/8 ${color}`
                            : "border-white/6 text-slate-500 hover:border-white/15 hover:text-slate-300"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Open 3D Globe CTA */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setView("globe")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-teal/20 bg-teal/5 hover:bg-teal/10 text-teal text-sm font-semibold transition-all"
              >
                <Globe className="w-4 h-4" />
                Open 3D Intelligence Globe
              </motion.button>
            </motion.div>
          ) : (
            /* Globe view — rendered directly to share globe layer state */
            <motion.div
              key="globe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative"
            >
              <IntelligenceGlobe
                layers={layers}
                conflictFeatures={conflictFeatures}
                reports={reports}
                commercialFlights={commercial}
                militaryFlights={military}
                earthquakes={seismic}
                satellites={satellites}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
      <SitrepModal
        open={sitrepOpen}
        onClose={() => setSitrepOpen(false)}
        conflictCount={conflicts.length}
        reportCount={reports.length}
        seismicCount={seismic.length}
        flightCount={commercial.length}
        milCount={military.length}
        viewCountry={effectiveCountry}
        conflicts={conflicts}
        reports={reports}
        seismic={seismic}
      />
      <CountryDeepDive
        open={deepDiveOpen}
        onClose={() => setDeepDiveOpen(false)}
        viewCountry={viewCountry}
        resolvedCountry={viewCountry === "My Location" ? resolvedCountry : undefined}
        resolvedIso3={viewCountry === "My Location" ? resolvedIso3 : undefined}
      />
    </div>
  );
}
