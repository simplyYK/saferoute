"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, ChevronUp, Flame, Crosshair, Newspaper, Plane, X, AlertTriangle, Wind } from "lucide-react";
import { useRiskIntelligence } from "@/hooks/useRiskIntelligence";

export default function SafetyDashboard() {
  const { gsi, airspace, loading } = useRiskIntelligence();
  const [mode, setMode] = useState<"full" | "compact">("full");
  const [detailOpen, setDetailOpen] = useState(false);
  const [shelterDismissed, setShelterDismissed] = useState(false);

  useEffect(() => {
    if (airspace?.isClosed) setShelterDismissed(false);
  }, [airspace?.isClosed]);

  if (!gsi) return null;

  const score = gsi.score;

  const summary = [
    gsi.conflictNearby > 0.5 && "active conflict nearby",
    gsi.thermalProximity > 0.5 && "thermal hotspots",
    airspace?.isClosed && "airspace closure",
    gsi.newsTone > 0.6 && "negative reporting",
    gsi.airQuality != null && gsi.airQuality > 150 && "poor air quality",
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  return (
    <>
      {/* Airspace Closure Modal */}
      <AnimatePresence>
        {airspace?.isClosed && !shelterDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-sm w-full bg-red-950 border-2 border-red-500 rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-300 uppercase tracking-wider">Seek Shelter</h2>
                  <p className="text-xs text-red-400">Airspace Closure Detected</p>
                </div>
              </div>
              <p className="text-sm text-red-200 leading-relaxed mb-4">{airspace.message}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShelterDismissed(true)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
                >
                  I Am In Shelter
                </button>
                <button
                  onClick={() => setShelterDismissed(true)}
                  className="px-4 py-2.5 rounded-xl border border-red-500/50 text-red-300 text-sm hover:bg-red-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Risk Card */}
      <AnimatePresence initial={false}>
        {mode === "full" ? (
          <motion.div
            key="full"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="absolute top-3 left-3 right-3 z-[500]"
          >
            <div
              className="rounded-2xl border border-white/10 bg-[#0a0f1e]/90 backdrop-blur-xl shadow-2xl overflow-hidden"
              style={{ borderLeft: `3px solid ${gsi.color}` }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Score circle */}
                <div className="relative w-12 h-12 shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                    <motion.circle
                      cx="24" cy="24" r="20"
                      fill="none"
                      stroke={gsi.color}
                      strokeWidth="3.5"
                      strokeDasharray={`${(score / 100) * 125.7} 125.7`}
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "0 125.7" }}
                      animate={{ strokeDasharray: `${(score / 100) * 125.7} 125.7` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                    style={{ color: gsi.color }}
                  >
                    {loading ? "…" : score}
                  </span>
                </div>

                {/* Label + summary */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Safety Index</p>
                  <p className="font-bold text-sm leading-tight" style={{ color: gsi.color }}>
                    {gsi.label}
                  </p>
                  {summary && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">⚠ {summary}</p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailOpen(!detailOpen)}
                    className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-all"
                  >
                    {detailOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setMode("compact")}
                    className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Expandable breakdown */}
              <AnimatePresence>
                {detailOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-white/6 space-y-2">
                      {gsi.conflictNearby > 0 && (
                        <Row
                          icon={<Crosshair className="w-3 h-3 text-red-400" />}
                          label="Conflict Events"
                          value={gsi.conflictNearby > 0.5 ? "HIGH" : gsi.conflictNearby > 0.2 ? "MODERATE" : "LOW"}
                          valueColor={gsi.conflictNearby > 0.5 ? "#DC2626" : gsi.conflictNearby > 0.2 ? "#F59E0B" : "#22C55E"}
                        />
                      )}
                      <Row
                        icon={<Flame className="w-3 h-3 text-orange-400" />}
                        label="Thermal Threat"
                        value={gsi.thermalProximity > 0.5 ? "HIGH" : gsi.thermalProximity > 0.2 ? "MODERATE" : "LOW"}
                        valueColor={gsi.thermalProximity > 0.5 ? "#DC2626" : gsi.thermalProximity > 0.2 ? "#F59E0B" : "#22C55E"}
                      />
                      <Row
                        icon={<Newspaper className="w-3 h-3 text-blue-400" />}
                        label="News Sentiment"
                        value={gsi.newsTone > 0.6 ? "NEGATIVE" : gsi.newsTone > 0.3 ? "MIXED" : "NEUTRAL"}
                        valueColor={gsi.newsTone > 0.6 ? "#DC2626" : gsi.newsTone > 0.3 ? "#F59E0B" : "#22C55E"}
                      />
                      {gsi.airQuality != null && (
                        <Row
                          icon={<Wind className="w-3 h-3 text-purple-400" />}
                          label="Air Quality"
                          value={`AQI ${gsi.airQuality} · ${gsi.airQualityCategory}`}
                          valueColor={gsi.airQuality > 150 ? "#DC2626" : gsi.airQuality > 100 ? "#F97316" : gsi.airQuality > 50 ? "#F59E0B" : "#22C55E"}
                        />
                      )}
                      {airspace && (
                        <Row
                          icon={<Plane className="w-3 h-3 text-cyan-400" />}
                          label="Airspace"
                          value={airspace.isClosed ? "CLOSED" : `${airspace.aircraftInRadius} aircraft`}
                          valueColor={airspace.isClosed ? "#DC2626" : "#22C55E"}
                        />
                      )}
                      <p className="text-[9px] text-slate-600 pt-1">GSI = (Shelter×0.35) − (Thermal×0.4) − (News×0.1) − (AQI×0.15)</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          /* Compact badge */
          <motion.div
            key="compact"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-3 left-3 z-[500]"
          >
            <button
              onClick={() => setMode("full")}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#0a0f1e]/90 backdrop-blur-md px-3 py-2 shadow-lg hover:bg-[#0a0f1e] transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: gsi.color }}
              >
                {score}
              </div>
              <Shield className="w-3.5 h-3.5" style={{ color: gsi.color }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Row({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-slate-400">
        {icon}
        {label}
      </span>
      <span className="font-semibold" style={{ color: valueColor ?? "#94a3b8" }}>
        {value}
      </span>
    </div>
  );
}
