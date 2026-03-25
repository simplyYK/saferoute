/**
 * RiskIntelligenceService — Global Safety Index (GSI)
 *
 * Design principle: START SAFE, only deduct for confirmed active threats.
 * A location with no data should score HIGH (safe), not moderate.
 *
 * GSI = 100 − thermal_penalty − conflict_penalty − aqi_penalty − news_penalty
 *
 * - thermal_penalty:   0–50  (NASA FIRMS hotspots within 5km — fires/explosions)
 * - conflict_penalty:  0–30  (ACLED events within 50km, severity/recency weighted)
 * - aqi_penalty:       0–10  (Only triggers if AQI > 100 — unhealthy)
 * - news_penalty:      0–10  (Only local/relevant negative reporting, 0 if no data)
 *
 * Score thresholds:
 * 80–100 → LOW RISK (green)
 * 60–79  → ELEVATED (amber)
 * 35–59  → HIGH RISK (orange)
 * 0–34   → CRITICAL  (red)
 */

import { haversineDistance } from "@/lib/utils/geo";

export interface GSIResult {
  score: number;
  label: string;
  color: string;
  shelterDensity: number;
  thermalProximity: number;
  newsTone: number;
  airQuality: number | null;
  airQualityCategory: string;
  conflictNearby: number;
  updatedAt: string;
}

export interface ThermalHotspot {
  lat: number;
  lng: number;
  brightness: number;
  frp: number;
  confidence: string;
  acq_date?: string;
  acq_time?: string;
}

export interface ConflictPoint {
  latitude: number;
  longitude: number;
  severity: string;
  event_date: string;
  fatalities?: number;
}

// ── Coordinate obfuscation ──────────────────────────────────────────────────
export function obfuscateCoord(val: number, decimals = 2): number {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

// ── Thermal penalty (0–50) ──────────────────────────────────────────────────
// Only fires within 5km count; scaled by proximity and fire intensity
function thermalPenalty(userLat: number, userLng: number, hotspots: ThermalHotspot[]): number {
  if (hotspots.length === 0) return 0;

  let worst = 0;
  for (const h of hotspots) {
    const dist = haversineDistance(userLat, userLng, h.lat, h.lng);
    if (dist <= 5) {
      const proximity = 1 - dist / 5;                   // 1 = on top, 0 = 5km away
      const frpWeight = Math.min(h.frp / 40, 1.5);      // bigger fire = more weight
      const penalty = proximity * Math.max(frpWeight, 0.3) * 50;
      if (penalty > worst) worst = penalty;
    }
  }
  return Math.min(worst, 50);
}

// ── Conflict penalty (0–30) ─────────────────────────────────────────────────
// ACLED events within 50km, weighted by severity and recency
function conflictPenalty(userLat: number, userLng: number, events: ConflictPoint[]): number {
  if (events.length === 0) return 0;

  const severityWeights: Record<string, number> = {
    critical: 12, high: 7, medium: 4, low: 2,
  };

  function timeDecay(dateStr: string): number {
    const hoursAgo = (Date.now() - new Date(dateStr).getTime()) / 3_600_000;
    if (hoursAgo < 24) return 1.0;
    if (hoursAgo < 72) return 0.7;
    if (hoursAgo < 168) return 0.4;
    if (hoursAgo < 720) return 0.15;
    return 0.05;
  }

  let total = 0;
  for (const e of events) {
    const dist = haversineDistance(userLat, userLng, e.latitude, e.longitude);
    if (dist > 50) continue;
    const distFactor = Math.max(0, 1 - dist / 50);     // closer = worse
    const weight = severityWeights[e.severity] ?? 3;
    const decay = timeDecay(e.event_date);
    const fatalityBonus = Math.min((e.fatalities ?? 0) * 0.3, 3);
    total += (weight + fatalityBonus) * distFactor * decay;
  }
  return Math.min(total, 30);
}

// ── AQI penalty (0–10) ──────────────────────────────────────────────────────
// Only penalises if air quality is actually unhealthy (AQI > 100)
function aqiPenalty(aqi: number | null): number {
  if (aqi == null || aqi <= 100) return 0;
  // Linear from AQI 100 (0 penalty) to 300+ (10 penalty)
  return Math.min((aqi - 100) / 20, 10);
}

// ── News penalty (0–10) ─────────────────────────────────────────────────────
// Only counts if there's a high proportion of critical news — neutral/mixed = 0
function newsPenalty(articles: { severity: string }[]): number {
  if (articles.length === 0) return 0;
  const critical = articles.filter((a) => a.severity === "critical").length;
  const warning  = articles.filter((a) => a.severity === "warning").length;
  // Only penalise if >= 30% of articles are critical/warning
  const ratio = (critical * 2 + warning) / (articles.length * 2);
  if (ratio < 0.3) return 0;
  return Math.min(ratio * 10, 10);
}

// ── Main calculator ─────────────────────────────────────────────────────────
export function calculateGSI(
  shelterCount: number,
  userLat: number,
  userLng: number,
  hotspots: ThermalHotspot[],
  newsArticles: { severity: string }[],
  aqi: number | null = null,
  aqiCategory: string = "Unknown",
  conflictEvents: ConflictPoint[] = []
): GSIResult {
  const T = thermalPenalty(userLat, userLng, hotspots);
  const C = conflictPenalty(userLat, userLng, conflictEvents);
  const A = aqiPenalty(aqi);
  const N = newsPenalty(newsArticles);

  const score = Math.max(0, Math.min(100, Math.round(100 - T - C - A - N)));

  return {
    score,
    label: gsiLabel(score),
    color: gsiColor(score),
    shelterDensity: shelterCount,
    thermalProximity: Math.round(T / 50 * 100) / 100,
    newsTone: Math.round(N / 10 * 100) / 100,
    airQuality: aqi,
    airQualityCategory: aqiCategory,
    conflictNearby: Math.round(C / 30 * 100) / 100,
    updatedAt: new Date().toISOString(),
  };
}

function gsiLabel(score: number): string {
  if (score >= 80) return "LOW RISK";
  if (score >= 60) return "ELEVATED";
  if (score >= 35) return "HIGH RISK";
  return "CRITICAL";
}

function gsiColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#F59E0B";
  if (score >= 35) return "#F97316";
  return "#DC2626";
}

// ── Dead-Drop detector ──────────────────────────────────────────────────────
export interface AirspaceStatus {
  aircraftInRadius: number;
  isClosed: boolean;
  message: string;
}

export function checkAirspaceClosure(
  userLat: number,
  userLng: number,
  flights: { lat: number; lng: number; onGround: boolean }[]
): AirspaceStatus {
  const RADIUS_KM = 50;
  const airborne = flights.filter((f) => !f.onGround);
  const nearby = airborne.filter(
    (f) => haversineDistance(userLat, userLng, f.lat, f.lng) <= RADIUS_KM
  );

  const isClosed = nearby.length === 0 && airborne.length > 20;

  return {
    aircraftInRadius: nearby.length,
    isClosed,
    message: isClosed
      ? `No aircraft within ${RADIUS_KM}km while ${airborne.length} are airborne globally. This may indicate closed/restricted airspace — seek immediate shelter.`
      : `${nearby.length} aircraft within ${RADIUS_KM}km. Airspace appears operational.`,
  };
}
