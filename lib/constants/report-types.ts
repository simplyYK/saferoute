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

// All community reports expire after 20 days (480 hours)
const TWENTY_DAYS = 480;

export const REPORT_EXPIRY_HOURS: Record<string, number> = {
  shelling: TWENTY_DAYS,
  gunfire: TWENTY_DAYS,
  chemical_threat: TWENTY_DAYS,
  medical_emergency: TWENTY_DAYS,
  unexploded_ordnance: TWENTY_DAYS,
  military_presence: TWENTY_DAYS,
  checkpoint: TWENTY_DAYS,
  blocked_road: TWENTY_DAYS,
  damaged_infrastructure: TWENTY_DAYS,
  safe_passage: TWENTY_DAYS,
  shelter_available: TWENTY_DAYS,
  aid_distribution: TWENTY_DAYS,
  other: TWENTY_DAYS,
};
