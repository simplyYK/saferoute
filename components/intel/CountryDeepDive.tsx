"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Users, DollarSign, AlertTriangle, BarChart3, Heart } from "lucide-react";
import { useHumanitarianData } from "@/hooks/useHumanitarianData";
import { Citation } from "@/components/shared/Citation";
import { REGIONS } from "@/lib/constants/regions";
import { nameToIso3 } from "@/lib/constants/country-codes";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function RiskMeter({ value, label, max = 10 }: { value: number; label: string; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct > 66 ? "#DC2626" : pct > 33 ? "#F59E0B" : "#22C55E";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold" style={{ color }}>{value.toFixed(1)}/{max}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function CountryDeepDive({
  open,
  onClose,
  viewCountry,
  resolvedCountry,
  resolvedIso3,
}: {
  open: boolean;
  onClose: () => void;
  viewCountry: string;
  resolvedCountry?: string;
  resolvedIso3?: string;
}) {
  const displayCountry = resolvedCountry || viewCountry;
  const region = REGIONS.find(
    (r) => r.country === displayCountry || r.name === displayCountry
  );
  const iso3 = resolvedIso3 || region?.iso3 || nameToIso3(displayCountry) || "";
  const { nationalRisk, idps, funding, humanNeeds, conflictEvents, loading } = useHumanitarianData(iso3);

  const totalIDPs = idps.reduce((sum, d) => sum + (d.population || 0), 0);
  const latestFunding = funding[0];
  const fundingGap = latestFunding
    ? ((latestFunding.requirements_usd - latestFunding.funding_usd) / latestFunding.requirements_usd) * 100
    : null;

  // Group conflict events by admin1
  const conflictByRegion = conflictEvents.reduce<Record<string, { events: number; fatalities: number }>>((acc, e) => {
    const key = e.admin1_name || "Unknown";
    if (!acc[key]) acc[key] = { events: 0, fatalities: 0 };
    acc[key].events += e.events || 0;
    acc[key].fatalities += e.fatalities || 0;
    return acc;
  }, {});
  const sortedRegions = Object.entries(conflictByRegion)
    .sort((a, b) => b[1].events - a[1].events)
    .slice(0, 8);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-[5%] z-[2001] sm:w-[520px] max-h-[85vh] overflow-y-auto bg-[#0d1424] border border-teal/20 rounded-3xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 sticky top-0 bg-[#0d1424] z-10">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal" />
                <span className="font-bold text-white tracking-wide text-sm">COUNTRY DEEP DIVE</span>
                <span className="text-[10px] text-teal uppercase tracking-widest font-semibold">{displayCountry}</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-teal/30 border-t-teal rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-500">Loading humanitarian data...</p>
                </div>
              ) : !iso3 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-400">No ISO3 code mapped for &quot;{displayCountry}&quot;</p>
                  <p className="text-xs text-slate-500 mt-1">Humanitarian data requires a recognized country region.</p>
                </div>
              ) : (
                <>
                  {/* Risk Score */}
                  {nationalRisk && (
                    <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-red-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">National Risk Score</h3>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center shrink-0"
                          style={{
                            borderColor: nationalRisk.overall_risk > 6.5 ? "#DC2626" : nationalRisk.overall_risk > 4 ? "#F59E0B" : "#22C55E",
                          }}
                        >
                          <span className="text-lg font-bold text-white">{nationalRisk.overall_risk.toFixed(1)}</span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <RiskMeter value={nationalRisk.hazard_exposure_risk} label="Hazard Exposure" />
                          <RiskMeter value={nationalRisk.vulnerability_risk} label="Vulnerability" />
                          <RiskMeter value={nationalRisk.coping_capacity_risk} label="Coping Capacity" />
                        </div>
                      </div>
                      <Citation source="HDX HAPI / OCHA" />
                    </section>
                  )}

                  {/* IDPs */}
                  {totalIDPs > 0 && (
                    <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Internally Displaced Persons</h3>
                      </div>
                      <p className="text-2xl font-bold text-amber-400">{formatNumber(totalIDPs)}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Total displaced population across all regions</p>
                      <Citation source="HDX HAPI / OCHA" />
                    </section>
                  )}

                  {/* Funding */}
                  {latestFunding && (
                    <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Humanitarian Funding</h3>
                      </div>
                      {latestFunding.appeal_name && (
                        <p className="text-[10px] text-slate-400 mb-2">{latestFunding.appeal_name}</p>
                      )}
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        <div>
                          <p className="text-[10px] text-slate-500">Required</p>
                          <p className="text-sm font-bold text-white">${formatNumber(latestFunding.requirements_usd)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Funded</p>
                          <p className="text-sm font-bold text-green-400">${formatNumber(latestFunding.funding_usd)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Gap</p>
                          <p className="text-sm font-bold text-red-400">{fundingGap != null ? `${fundingGap.toFixed(0)}%` : "—"}</p>
                        </div>
                      </div>
                      {latestFunding.funding_pct > 0 && (
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(latestFunding.funding_pct, 100)}%` }}
                          />
                        </div>
                      )}
                      <Citation source="HDX HAPI / OCHA" />
                    </section>
                  )}

                  {/* Conflict Events by Region */}
                  {sortedRegions.length > 0 && (
                    <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Conflict Events by Region</h3>
                      </div>
                      <div className="space-y-1.5">
                        {sortedRegions.map(([region, data]) => (
                          <div key={region} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 truncate max-w-[180px]">{region}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">{data.events} events</span>
                              {data.fatalities > 0 && (
                                <span className="text-red-400">{data.fatalities} fatal.</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Citation source="HDX HAPI / ACLED" />
                    </section>
                  )}

                  {/* Humanitarian Needs */}
                  {humanNeeds.length > 0 && (
                    <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-4 h-4 text-pink-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Humanitarian Needs</h3>
                      </div>
                      <div className="space-y-1.5">
                        {humanNeeds
                          .filter((n) => n.population_in_need > 0)
                          .slice(0, 8)
                          .map((n, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-slate-300 truncate max-w-[200px]">{n.sector_name || "General"}</span>
                              <span className="text-pink-400 font-medium">{formatNumber(n.population_in_need)} in need</span>
                            </div>
                          ))}
                      </div>
                      <Citation source="HDX HAPI / OCHA" />
                    </section>
                  )}

                  {/* No data state */}
                  {!nationalRisk && totalIDPs === 0 && !latestFunding && sortedRegions.length === 0 && humanNeeds.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-400">No humanitarian data available for {viewCountry}</p>
                      <p className="text-xs text-slate-500 mt-1">Data may not be covered by HDX HAPI for this region.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
