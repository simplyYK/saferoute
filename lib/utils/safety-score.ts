import type { ConflictEvent } from "@/types/conflict";
import type { Report } from "@/types/report";
import { haversineDistance } from "./geo";

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
  positive: -10,
};

function timeDecay(dateStr: string): number {
  const hoursAgo = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) return 1.0;
  if (hoursAgo < 6) return 0.8;
  if (hoursAgo < 24) return 0.5;
  if (hoursAgo < 72) return 0.3;
  if (hoursAgo < 168) return 0.15;
  return 0.05;
}

export function calculateSafetyScore(
  coordinates: [number, number][],
  conflictEvents: ConflictEvent[],
  reports: Report[],
  proximityRadiusKm = 2
): number {
  if (coordinates.length === 0) return 50;

  let totalPenalty = 0;
  const sampleRate = Math.max(1, Math.floor(coordinates.length / 50));
  const sampled = coordinates.filter((_, i) => i % sampleRate === 0);

  for (const event of conflictEvents) {
    for (const [lng, lat] of sampled) {
      const dist = haversineDistance(lat, lng, event.latitude, event.longitude);
      if (dist <= proximityRadiusKm) {
        const distanceFactor = 1 - dist / proximityRadiusKm;
        const weight = SEVERITY_WEIGHTS[event.severity] || 10;
        const decay = timeDecay(event.event_date);
        const fatalityBonus = Math.min(event.fatalities * 2, 20);
        totalPenalty += (weight + fatalityBonus) * distanceFactor * decay;
        break;
      }
    }
  }

  for (const report of reports) {
    for (const [lng, lat] of sampled) {
      const dist = haversineDistance(lat, lng, report.latitude, report.longitude);
      if (dist <= proximityRadiusKm) {
        const distanceFactor = 1 - dist / proximityRadiusKm;
        const weight = SEVERITY_WEIGHTS[report.severity] || 10;
        const decay = timeDecay(report.created_at);
        const confirmBonus = Math.min(report.confirmations * 0.5, 5);
        totalPenalty += (weight + confirmBonus) * distanceFactor * decay;
        break;
      }
    }
  }

  return Math.max(0, Math.min(100, Math.round(100 - (totalPenalty / 200) * 100)));
}

export function safetyScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#DC2626";
}

export function safetyScoreLabel(score: number): string {
  if (score >= 80) return "Relatively Safe";
  if (score >= 60) return "Exercise Caution";
  if (score >= 40) return "Risky";
  return "Dangerous";
}
