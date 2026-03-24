export type ReportCategory =
  | "shelling"
  | "gunfire"
  | "military_presence"
  | "checkpoint"
  | "blocked_road"
  | "damaged_infrastructure"
  | "unexploded_ordnance"
  | "chemical_threat"
  | "safe_passage"
  | "shelter_available"
  | "aid_distribution"
  | "medical_emergency"
  | "other";

export type ReportStatus = "active" | "expired" | "resolved" | "false_report";
export type SeverityLevel = "critical" | "high" | "medium" | "low" | "positive";

export interface Report {
  id: string;
  category: ReportCategory;
  severity: SeverityLevel;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  status: ReportStatus;
  confirmations: number;
  denials: number;
  reporter_id: string | null;
  language: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface CreateReportInput {
  category: ReportCategory;
  severity: SeverityLevel;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  reporter_id: string;
  language?: string;
}
