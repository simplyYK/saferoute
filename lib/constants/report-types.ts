import type { SeverityLevel } from "@/types/report";

export const REPORT_CATEGORIES = [
  { id: "shelling", icon: "💥", color: "#DC2626", severity: "critical" as SeverityLevel, label: "Shelling / Explosions" },
  { id: "gunfire", icon: "🔫", color: "#DC2626", severity: "high" as SeverityLevel, label: "Gunfire" },
  { id: "military_presence", icon: "🪖", color: "#F59E0B", severity: "high" as SeverityLevel, label: "Military Presence" },
  { id: "checkpoint", icon: "🚧", color: "#F59E0B", severity: "medium" as SeverityLevel, label: "Checkpoint" },
  { id: "blocked_road", icon: "⛔", color: "#F97316", severity: "medium" as SeverityLevel, label: "Blocked Road" },
  { id: "damaged_infrastructure", icon: "🏗️", color: "#F97316", severity: "medium" as SeverityLevel, label: "Damaged Infrastructure" },
  { id: "unexploded_ordnance", icon: "💣", color: "#DC2626", severity: "critical" as SeverityLevel, label: "Unexploded Ordnance" },
  { id: "chemical_threat", icon: "☣️", color: "#DC2626", severity: "critical" as SeverityLevel, label: "Chemical / Hazmat" },
  { id: "medical_emergency", icon: "🚑", color: "#DC2626", severity: "critical" as SeverityLevel, label: "Medical Emergency" },
  { id: "safe_passage", icon: "✅", color: "#22C55E", severity: "positive" as SeverityLevel, label: "Safe Passage" },
  { id: "shelter_available", icon: "🏠", color: "#22C55E", severity: "positive" as SeverityLevel, label: "Shelter Available" },
  { id: "aid_distribution", icon: "📦", color: "#22C55E", severity: "positive" as SeverityLevel, label: "Aid Distribution" },
  { id: "other", icon: "ℹ️", color: "#64748B", severity: "low" as SeverityLevel, label: "Other" },
] as const;

export const SEVERITY_LEVELS = [
  { id: "critical", icon: "🔴", color: "#DC2626", activeClass: "bg-red-600 text-white border-red-600" },
  { id: "high", icon: "🟠", color: "#F97316", activeClass: "bg-orange-600 text-white border-orange-600" },
  { id: "medium", icon: "🟡", color: "#F59E0B", activeClass: "bg-amber-500 text-white border-amber-500" },
  { id: "low", icon: "🔵", color: "#3B82F6", activeClass: "bg-blue-600 text-white border-blue-600" },
  { id: "positive", icon: "🟢", color: "#22C55E", activeClass: "bg-green-600 text-white border-green-600" },
] as const;

export const REPORT_EXPIRY_HOURS: Record<string, number> = {
  shelling: 4,
  gunfire: 4,
  chemical_threat: 4,
  medical_emergency: 4,
  unexploded_ordnance: 72,
  military_presence: 12,
  checkpoint: 24,
  blocked_road: 12,
  damaged_infrastructure: 48,
  safe_passage: 6,
  shelter_available: 24,
  aid_distribution: 12,
  other: 24,
};
