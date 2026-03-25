/**
 * RiskIntelligenceService — computes the Global Safety Index (GSI)
 *
 * GSI = (S_shelter × 0.4) − (T_thermal × 0.5) − (V_tone × 0.1)
 *
 * S_shelter  = normalised density of OSM-verified safe havens within 5km
 * T_thermal  = normalised proximity to NASA FIRMS fire/thermal anomalies
 * V_tone     = GDELT-derived negative news sentiment score (0..1)
 *
 * Final GSI is clamped to 0..100 where 100 = safest.
 */

import { haversineDistance } from "@/lib/utils/geo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GSIResult {
  score: number; // 0 – 100
  label: string;
  color: string;
  shelterDensity: number; // raw count within radius
  thermalProximity: number; // 0..1 — closer = worse
  newsTone: number; // 0..1 — higher = more negative
  airQuality: number | null; // AQI value (null if unavailable)
  airQualityCategory: string; // e.g. "Good", "Moderate", etc.
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

// ---------------------------------------------------------------------------
// Coordinate obfuscation (privacy)
// ---------------------------------------------------------------------------

/**
 * Blurs a coordinate to ~500m precision before sending to external APIs.
 * This prevents exact user location from leaking to GDELT / NASA servers.
 */
export function obfuscateCoord(val: number, decimals = 2): number {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

// ---------------------------------------------------------------------------
// Sub-scores
// ---------------------------------------------------------------------------

/** Shelter density score (0..1): how many shelters per 5km radius (capped at 10) */
function shelterScore(shelterCount: number): number {
  return Math.min(shelterCount / 10, 1);
}

/** Thermal proximity score (0..1): 1 = hotspot right on user, 0 = none nearby */
function thermalScore(
  userLat: number,
  userLng: number,
  hotspots: ThermalHotspot[],
  radiusKm = 5
): number {
  if (hotspots.length === 0) return 0;

  let worstProximity = 0;
  for (const h of hotspots) {
    const dist = haversineDistance(userLat, userLng, h.lat, h.lng);
    if (dist <= radiusKm) {
      const proximity = 1 - dist / radiusKm; // 1 = on top of it
      // Weight by fire radiative power (bigger fire = worse)
      const frpWeight = Math.min(h.frp / 50, 2); // cap at 2×
      const adjusted = proximity * Math.max(frpWeight, 0.5);
      if (adjusted > worstProximity) worstProximity = adjusted;
    }
  }
  return Math.min(worstProximity, 1);
}

/** News sentiment score (0..1): fraction of nearby articles that are critical/warning */
function newsToneScore(
  articles: { severity: string }[]
): number {
  if (articles.length === 0) return 0;
  const negative = articles.filter(
    (a) => a.severity === "critical" || a.severity === "warning"
  ).length;
  return negative / articles.length;
}

// ---------------------------------------------------------------------------
// Main calculator
// ---------------------------------------------------------------------------

/** Air quality score (0..1): 1 = hazardous, 0 = good */
function airQualityScore(aqi: number | null): number {
  if (aqi == null) return 0;
  // US EPA AQI: 0-50 Good, 51-100 Moderate, 101-150 Unhealthy Sensitive, 151-200 Unhealthy, 201-300 Very Unhealthy, 301+ Hazardous
  return Math.min(aqi / 300, 1);
}

export function calculateGSI(
  shelterCount: number,
  userLat: number,
  userLng: number,
  hotspots: ThermalHotspot[],
  newsArticles: { severity: string }[],
  aqi: number | null = null,
  aqiCategory: string = "Unknown"
): GSIResult {
  const S = shelterScore(shelterCount);
  const T = thermalScore(userLat, userLng, hotspots);
  const V = newsToneScore(newsArticles);
  const A = airQualityScore(aqi);

  // GSI formula: positive from shelters, negative from threats/news/air
  // Adjusted weights to accommodate air quality: shelter 0.35, thermal 0.4, news 0.1, air 0.15
  const rawGsi = S * 0.35 - T * 0.4 - V * 0.1 - A * 0.15;
  // Map from [-0.65, 0.35] range to [0, 100]
  const score = Math.max(0, Math.min(100, Math.round((rawGsi + 0.65) * 100)));

  return {
    score,
    label: gsiLabel(score),
    color: gsiColor(score),
    shelterDensity: shelterCount,
    thermalProximity: Math.round(T * 100) / 100,
    newsTone: Math.round(V * 100) / 100,
    airQuality: aqi,
    airQualityCategory: aqiCategory,
    updatedAt: new Date().toISOString(),
  };
}

function gsiLabel(score: number): string {
  if (score >= 75) return "LOW RISK";
  if (score >= 50) return "MODERATE";
  if (score >= 25) return "HIGH RISK";
  return "CRITICAL";
}

function gsiColor(score: number): string {
  if (score >= 75) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  if (score >= 25) return "#F97316";
  return "#DC2626";
}

// ---------------------------------------------------------------------------
// Dead-Drop detector: zero aircraft in 50km radius = closed airspace alert
// ---------------------------------------------------------------------------

export interface AirspaceStatus {
  aircraftInRadius: number;
  isClosed: boolean;
  message: string;
}

export function checkAirspaceClosure(
  userLat: number,
  userLng: number,
  flights: { lat: number; lng: number; onGround: boolean }[],
  radiusKm = 50
): AirspaceStatus {
  const airborne = flights.filter((f) => !f.onGround);
  const inRadius = airborne.filter(
    (f) => haversineDistance(userLat, userLng, f.lat, f.lng) <= radiusKm
  );

  if (inRadius.length === 0 && airborne.length > 20) {
    // There are plenty of aircraft globally but zero near us —
    // strong indicator of closed/restricted airspace
    return {
      aircraftInRadius: 0,
      isClosed: true,
      message:
        "AIRSPACE CLOSURE DETECTED — Zero aircraft within 50 km while global traffic is active. This may indicate imminent military activity. SEEK SHELTER IMMEDIATELY.",
    };
  }

  return {
    aircraftInRadius: inRadius.length,
    isClosed: false,
    message: `${inRadius.length} aircraft within 50 km`,
  };
}
