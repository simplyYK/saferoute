import { supabase } from "./client";
import type { Report, CreateReportInput } from "@/types/report";

export async function createReport(input: CreateReportInput): Promise<Report> {
  const { data, error } = await supabase
    .from("reports")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Report;
}

export async function getActiveReports(lat: number, lng: number, radiusKm = 50): Promise<Report[]> {
  const { data, error } = await supabase.rpc("nearby_reports", {
    user_lat: lat,
    user_lng: lng,
    radius_km: radiusKm,
  });
  if (error) {
    // Fallback: query without geo function
    const { data: fallback } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(200);
    return (fallback as Report[]) || [];
  }
  return (data as Report[]) || [];
}

export async function confirmReport(
  reportId: string,
  deviceId: string,
  isConfirm: boolean
): Promise<void> {
  const { error } = await supabase.rpc("confirm_report", {
    target_report_id: reportId,
    user_device_id: deviceId,
    is_confirm: isConfirm,
  });
  if (error) throw new Error(error.message);
}
