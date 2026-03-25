"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Newspaper, Settings, ExternalLink, RefreshCw,
  Clock, Eye, MapPin, Bell, Shield, Wifi, Database,
  ChevronRight, Check, Radio,
} from "lucide-react";
import { useAppStore, type VisualMode } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import { REGIONS } from "@/lib/constants/regions";
import { useLanguage } from "@/hooks/useLanguage";

interface Article {
  title: string;
  description: string;
  source: string;
  url: string;
  link?: string;
  severity: "critical" | "warning" | "advisory" | "info";
  publishedAt?: string;
  pubDate?: string;
  conflictZone?: string;
}

const SEVERITY_COLORS = {
  critical: { border: "border-l-red-500", badge: "bg-red-500/15 text-red-300", dot: "bg-red-500" },
  warning:  { border: "border-l-orange-400", badge: "bg-orange-500/15 text-orange-300", dot: "bg-orange-400" },
  advisory: { border: "border-l-yellow-400", badge: "bg-yellow-500/15 text-yellow-300", dot: "bg-yellow-400" },
  info:     { border: "border-l-blue-400", badge: "bg-blue-500/15 text-blue-300", dot: "bg-blue-400" },
};

const VISUAL_MODES: { id: VisualMode; label: string; desc: string; icon: string }[] = [
  { id: "standard", label: "Standard",    desc: "Default view",        icon: "🌐" },
  { id: "night",    label: "Night Vision",desc: "NVG green filter",    icon: "🌙" },
  { id: "flir",     label: "FLIR Thermal",desc: "Heat signature mode", icon: "🔴" },
  { id: "blackout", label: "Blackout",    desc: "Low-visibility ops",  icon: "⬛" },
  { id: "crt",      label: "CRT Terminal",desc: "Retro display",       icon: "📺" },
];

const LANGUAGES = [
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "ar", label: "العربية",    flag: "🌍" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "my", label: "ဗမာ",        flag: "🇲🇲" },
];

const SEVERITY_FILTERS = [
  { id: "all",      label: "All" },
  { id: "critical", label: "Critical" },
  { id: "warning",  label: "Warning" },
  { id: "advisory", label: "Advisory" },
];

const ZONE_KEYWORDS = ["Ukraine", "Gaza", "Israel", "Iran", "Iraq", "Sudan", "Myanmar", "Yemen", "Syria", "Lebanon", "Somalia", "Afghanistan", "Congo", "Libya", "Mali", "Haiti", "Ethiopia"];

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return "";
  const diff = (Date.now() - t) / 1000;
  if (diff < 0 || diff > 365 * 86400) return "";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function AppDrawer({ open, onClose }: AppDrawerProps) {
  const { visualMode, setVisualMode } = useAppStore();
  const { viewCountry, setViewCountry, setCenter, flyTo } = useMapStore();
  const { language, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState<"news" | "settings">("news");
  const [articles, setArticles] = useState<Article[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [criticalCount, setCriticalCount] = useState(0);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [settingsSection, setSettingsSection] = useState<"display" | "region" | "language" | "privacy" | null>(null);

  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const res = await fetch("/api/gdelt");
      const data = await res.json() as { articles?: Article[] };
      const arts = data.articles ?? [];
      setArticles(arts);
      setCriticalCount(arts.filter((a) => a.severity === "critical").length);
      setLastUpdated(new Date());
    } catch { /* ignore */ } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && articles.length === 0) void fetchNews();
  }, [open, articles.length, fetchNews]);

  useEffect(() => {
    const handler = () => { void fetchNews(); };
    window.addEventListener("saferoute:refresh", handler);
    return () => window.removeEventListener("saferoute:refresh", handler);
  }, [fetchNews]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filteredArticles = articles.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (zoneFilter !== "all") {
      const text = `${a.title} ${a.description}`.toLowerCase();
      if (!text.includes(zoneFilter.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed right-0 top-0 bottom-0 z-[1101] w-full max-w-[360px] flex flex-col shadow-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0d1628 0%, #0a1020 100%)",
              borderLeft: "1px solid rgba(14,165,233,0.1)",
            }}
          >
            {/* Accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal/60 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0">
              <div className="flex gap-1 bg-white/5 border border-white/8 rounded-xl p-0.5">
                {(["news", "settings"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                      activeTab === tab
                        ? "bg-teal/20 text-teal"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab === "news" ? <Newspaper className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
                    {tab}
                    {tab === "news" && criticalCount > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {criticalCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* ─── NEWS TAB ─── */}
              {activeTab === "news" && (
                <div className="flex flex-col">
                  {/* Filter bar */}
                  <div className="px-4 pb-3 space-y-2">
                    {/* Severity */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {SEVERITY_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSeverityFilter(f.id)}
                          className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                            severityFilter === f.id
                              ? "border-teal/50 bg-teal/15 text-teal"
                              : "border-white/10 text-slate-500 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {/* Zone filter dropdown */}
                    <select
                      value={zoneFilter}
                      onChange={(e) => setZoneFilter(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium appearance-none cursor-pointer focus:border-teal/40 focus:outline-none transition-colors"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                    >
                      <option value="all" className="bg-[#0d1424] text-white">All Regions</option>
                      {ZONE_KEYWORDS.map((zone) => (
                        <option key={zone} value={zone} className="bg-[#0d1424] text-white">{zone}</option>
                      ))}
                    </select>

                    {/* Refresh row */}
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-600">
                        {filteredArticles.length} articles {lastUpdated ? `· ${timeAgo(lastUpdated.toISOString())}` : ""}
                      </p>
                      <button
                        onClick={fetchNews}
                        disabled={newsLoading}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${newsLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Article list */}
                  {newsLoading && filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-slate-600">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <p className="text-xs">Loading intelligence…</p>
                    </div>
                  ) : filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-slate-600">
                      <Newspaper className="w-5 h-5" />
                      <p className="text-xs">No articles match filters</p>
                    </div>
                  ) : (
                    <div>
                      {filteredArticles.map((article, i) => {
                        const colors = SEVERITY_COLORS[article.severity];
                        return (
                          <motion.a
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.025 }}
                            href={article.url || article.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block px-4 py-3 hover:bg-white/3 transition-colors border-l-2 ${colors.border} group`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h3 className="text-[13px] font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-snug transition-colors">
                                {article.title}
                              </h3>
                              <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-slate-400 shrink-0 mt-0.5 transition-colors" />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.badge}`}>
                                {article.severity}
                              </span>
                              <span className="text-[10px] text-slate-600">{article.source}</span>
                              <span className="text-[10px] text-slate-700 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {timeAgo(article.pubDate ?? article.publishedAt)}
                              </span>
                            </div>
                          </motion.a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── SETTINGS TAB ─── */}
              {activeTab === "settings" && (
                <div className="px-4 py-2 space-y-1.5 pb-8">
                  {/* Visual Mode */}
                  <SettingsSection
                    icon={Eye}
                    title="Visual Mode"
                    value={VISUAL_MODES.find((m) => m.id === visualMode)?.label}
                    open={settingsSection === "display"}
                    onToggle={() => setSettingsSection(settingsSection === "display" ? null : "display")}
                  >
                    <div className="space-y-1 mt-2">
                      {VISUAL_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setVisualMode(mode.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                            visualMode === mode.id
                              ? "border-teal/40 bg-teal/10 text-teal"
                              : "border-white/6 text-slate-400 hover:border-white/15 hover:text-white"
                          }`}
                        >
                          <span className="text-base">{mode.icon}</span>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{mode.label}</p>
                            <p className="text-[10px] opacity-60">{mode.desc}</p>
                          </div>
                          {visualMode === mode.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </SettingsSection>

                  {/* Region */}
                  <SettingsSection
                    icon={MapPin}
                    title="Active Region"
                    value={viewCountry}
                    open={settingsSection === "region"}
                    onToggle={() => setSettingsSection(settingsSection === "region" ? null : "region")}
                  >
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {REGIONS.map((r) => {
                        const active = r.country === viewCountry || r.name === viewCountry;
                        return (
                          <button
                            key={r.id}
                            onClick={() => {
                              setViewCountry(r.country);
                              setCenter(r.center);
                              flyTo(r.center);
                              setSettingsSection(null);
                            }}
                            className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${
                              active
                                ? "border-teal/40 bg-teal/10 text-teal"
                                : "border-white/6 text-slate-400 hover:border-white/15 hover:text-white"
                            }`}
                          >
                            {active && <span className="mr-1">●</span>}
                            {r.name}
                          </button>
                        );
                      })}
                    </div>
                  </SettingsSection>

                  {/* Language */}
                  <SettingsSection
                    icon={Radio}
                    title="Language"
                    value={LANGUAGES.find((l) => l.code === language)?.label}
                    open={settingsSection === "language"}
                    onToggle={() => setSettingsSection(settingsSection === "language" ? null : "language")}
                  >
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => setLanguage(l.code)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                            language === l.code
                              ? "border-teal/40 bg-teal/10 text-teal"
                              : "border-white/6 text-slate-400 hover:border-white/15 hover:text-white"
                          }`}
                        >
                          <span>{l.flag}</span>
                          {l.label}
                          {language === l.code && <Check className="w-3 h-3 ml-auto shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </SettingsSection>

                  {/* Privacy */}
                  <SettingsSection
                    icon={Shield}
                    title="Privacy & Security"
                    value="Location protected"
                    open={settingsSection === "privacy"}
                    onToggle={() => setSettingsSection(settingsSection === "privacy" ? null : "privacy")}
                  >
                    <div className="mt-2 space-y-2">
                      <ToggleSetting
                        icon={MapPin}
                        label="Obfuscate Location"
                        sublabel="~500m precision for external APIs"
                        defaultOn={true}
                      />
                      <ToggleSetting
                        icon={Database}
                        label="Local Data Only"
                        sublabel="No telemetry sent to servers"
                        defaultOn={true}
                      />
                      <ToggleSetting
                        icon={Wifi}
                        label="Offline Cache"
                        sublabel="Cache map tiles for offline use"
                        defaultOn={true}
                      />
                      <ToggleSetting
                        icon={Bell}
                        label="Critical Alerts"
                        sublabel="Airspace closure & threat alerts"
                        defaultOn={true}
                      />
                    </div>
                  </SettingsSection>

                  {/* App info */}
                  <div className="mt-4 px-3 py-3 rounded-xl border border-white/5 bg-white/2">
                    <p className="text-[10px] text-slate-600 font-mono">SENTINEL v2.0 · Crisis Intelligence Platform</p>
                    <p className="text-[10px] text-slate-700 mt-0.5">Data: ACLED · NASA FIRMS · USGS · OpenSky · ADSB · Supabase</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function SettingsSection({
  icon: Icon, title, value, open, onToggle, children
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/4 transition-colors"
      >
        <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-slate-300" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white">{title}</p>
          {value && <p className="text-xs text-slate-500 mt-0.5">{value}</p>}
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleSetting({
  icon: Icon, label, sublabel, defaultOn
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn ?? false);
  return (
    <button
      onClick={() => setOn(!on)}
      className="w-full flex items-center gap-3 py-2 group"
    >
      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <div className="flex-1 text-left">
        <p className="text-xs font-medium text-slate-300">{label}</p>
        <p className="text-[10px] text-slate-600">{sublabel}</p>
      </div>
      <div className={`w-9 h-5 rounded-full transition-all relative ${on ? "bg-teal" : "bg-white/10"}`}>
        <motion.div
          animate={{ x: on ? 16 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </div>
    </button>
  );
}
