"use client";
import { useState, useEffect } from "react";
import { Shield, ChevronDown, ChevronUp, Flame, Building2, Newspaper, Plane, X, AlertTriangle, Wind } from "lucide-react";
import { useRiskIntelligence } from "@/hooks/useRiskIntelligence";

export default function SafetyDashboard() {
  const { gsi, airspace, loading } = useRiskIntelligence();
  const [expanded, setExpanded] = useState(false);
  const [shelterDismissed, setShelterDismissed] = useState(false);

  // Reset shelter dismissal if airspace status changes
  useEffect(() => {
    if (airspace?.isClosed) setShelterDismissed(false);
  }, [airspace?.isClosed]);

  if (!gsi) return null;

  const score = gsi.score;

  return (
    <>
      {/* Dead-Drop Shelter Alert Modal */}
      {airspace?.isClosed && !shelterDismissed && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 animate-pulse-bg">
          <div className="max-w-sm w-full bg-red-950 border-2 border-red-500 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-300 uppercase tracking-wider">
                  Seek Shelter
                </h2>
                <p className="text-xs text-red-400">Airspace Closure Detected</p>
              </div>
            </div>
            <p className="text-sm text-red-200 leading-relaxed mb-4">
              {airspace.message}
            </p>
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
          </div>
        </div>
      )}

      {/* GSI Dashboard Widget */}
      <div className="absolute top-3 left-3 z-[500]">
        {/* Collapsed: just the score badge */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/70 backdrop-blur-md px-3 py-2 shadow-xl hover:bg-black/80 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: gsi.color }}
          >
            {loading ? "..." : score}
          </div>
          <div className="text-left">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
              Safety Index
            </p>
            <p className="text-xs font-bold" style={{ color: gsi.color }}>
              {gsi.label}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* Expanded: full breakdown */}
        {expanded && (
          <div className="mt-2 rounded-xl border border-white/15 bg-black/80 backdrop-blur-md p-3 shadow-xl w-64 space-y-3">
            {/* Score ring */}
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke={gsi.color}
                    strokeWidth="4"
                    strokeDasharray={`${(score / 100) * 150.8} 150.8`}
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ color: gsi.color }}
                >
                  {score}
                </span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  Global Safety Index
                </p>
                <p className="text-[10px] text-slate-400">
                  5 km radius · {new Date(gsi.updatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-green-400" />
                  Shelters Nearby
                </span>
                <span className="text-white font-medium">{gsi.shelterDensity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Thermal Threat
                </span>
                <span
                  className="font-medium"
                  style={{
                    color:
                      gsi.thermalProximity > 0.5
                        ? "#DC2626"
                        : gsi.thermalProximity > 0.2
                        ? "#F59E0B"
                        : "#22C55E",
                  }}
                >
                  {gsi.thermalProximity > 0.5
                    ? "HIGH"
                    : gsi.thermalProximity > 0.2
                    ? "MODERATE"
                    : "LOW"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Newspaper className="w-3.5 h-3.5 text-blue-400" />
                  News Sentiment
                </span>
                <span
                  className="font-medium"
                  style={{
                    color:
                      gsi.newsTone > 0.6
                        ? "#DC2626"
                        : gsi.newsTone > 0.3
                        ? "#F59E0B"
                        : "#22C55E",
                  }}
                >
                  {gsi.newsTone > 0.6
                    ? "NEGATIVE"
                    : gsi.newsTone > 0.3
                    ? "MIXED"
                    : "NEUTRAL"}
                </span>
              </div>
              {gsi.airQuality != null && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Wind className="w-3.5 h-3.5 text-purple-400" />
                    Air Quality
                  </span>
                  <span
                    className="font-medium"
                    style={{
                      color:
                        gsi.airQuality > 150
                          ? "#DC2626"
                          : gsi.airQuality > 100
                          ? "#F97316"
                          : gsi.airQuality > 50
                          ? "#F59E0B"
                          : "#22C55E",
                    }}
                  >
                    AQI {gsi.airQuality} · {gsi.airQualityCategory}
                  </span>
                </div>
              )}
              {airspace && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Plane className="w-3.5 h-3.5 text-cyan-400" />
                    Airspace
                  </span>
                  <span
                    className={`font-medium ${
                      airspace.isClosed ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {airspace.isClosed
                      ? "CLOSED"
                      : `${airspace.aircraftInRadius} aircraft`}
                  </span>
                </div>
              )}
            </div>

            {/* Formula note */}
            <p className="text-[9px] text-slate-500 border-t border-white/10 pt-2">
              GSI = (Shelter × 0.35) − (Thermal × 0.4) − (News × 0.1) − (AQI × 0.15)
            </p>
          </div>
        )}
      </div>
    </>
  );
}
