"use client";
import { useState, useCallback } from "react";
import { REPORT_CATEGORIES, SEVERITY_LEVELS, REPORT_EXPIRY_HOURS } from "@/lib/constants/report-types";
import { supabase } from "@/lib/supabase/client";
import type { ReportCategory, SeverityLevel } from "@/types/report";
import { CheckCircle, MapPin, Send, Loader2, ArrowLeft } from "lucide-react";

interface ReportFormProps {
  initialLat?: number;
  initialLng?: number;
  onSuccess?: () => void;
}

type Step = "category" | "details" | "submit";

export default function ReportForm({ initialLat, initialLng, onSuccess }: ReportFormProps) {
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(initialLat || 0);
  const [lng, setLng] = useState(initialLng || 0);
  const [locationName, setLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDeviceId = () => {
    if (typeof localStorage === "undefined") return crypto.randomUUID();
    let id = localStorage.getItem("saferoute_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("saferoute_device_id", id);
    }
    return id;
  };

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {}
    );
  }, []);

  const handleCategorySelect = (cat: ReportCategory) => {
    const catDef = REPORT_CATEGORIES.find((c) => c.id === cat);
    setCategory(cat);
    if (catDef) setSeverity(catDef.severity as SeverityLevel);
    getLocation();
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!category || !title.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const expiryHours = REPORT_EXPIRY_HOURS[category] || 24;
      const expiresAt = new Date(Date.now() + expiryHours * 3600000).toISOString();

      const { error: err } = await supabase.from("reports").insert({
        category,
        severity,
        title: title.trim(),
        description: description.trim() || null,
        latitude: lat,
        longitude: lng,
        location_name: locationName || null,
        reporter_id: getDeviceId(),
        language: localStorage?.getItem("saferoute_language") || "en",
        expires_at: expiresAt,
        status: "active",
        confirmations: 0,
        denials: 0,
      });

      if (err) throw err;
      setSuccess(true);
      setTimeout(() => onSuccess?.(), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-green-800">Report Submitted!</h3>
        <p className="text-slate-600 mt-2">Thank you. Your report will help keep others safe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {step !== "category" && (
          <button
            onClick={() => setStep(step === "submit" ? "details" : "category")}
            className="p-1 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <span>{step === "category" ? "Select category" : step === "details" ? "Add details" : "Confirm location"}</span>
      </div>

      {/* Step 1: Category */}
      {step === "category" && (
        <div className="grid grid-cols-3 gap-2">
          {REPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id as ReportCategory)}
              className="flex flex-col items-center p-3 rounded-xl border-2 border-slate-200 hover:border-teal transition-all min-h-[80px] bg-white"
            >
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span className="text-xs text-center font-medium leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Details */}
      {step === "details" && category && (
        <div className="space-y-3">
          {/* Selected category */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
            <span className="text-xl">{REPORT_CATEGORIES.find((c) => c.id === category)?.icon}</span>
            <span className="font-medium text-sm">{REPORT_CATEGORIES.find((c) => c.id === category)?.label}</span>
          </div>

          {/* Severity */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Severity</label>
            <div className="flex gap-2 flex-wrap">
              {SEVERITY_LEVELS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeverity(s.id as SeverityLevel)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-colors min-h-[36px] ${
                    severity === s.id ? s.activeClass : "border-slate-200 text-slate-600"
                  }`}
                >
                  {s.icon} {s.id}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Brief description of the hazard..."
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-teal outline-none min-h-[44px]"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              placeholder="Any additional information..."
              rows={2}
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-teal outline-none resize-none"
            />
          </div>

          <button
            onClick={() => setStep("submit")}
            disabled={!title.trim()}
            className="w-full bg-teal text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
          >
            <MapPin className="w-4 h-4" />
            Set Location & Submit
          </button>
        </div>
      )}

      {/* Step 3: Location & Submit */}
      {step === "submit" && (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Location</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                placeholder="Latitude"
                step="0.0001"
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                placeholder="Longitude"
                step="0.0001"
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={getLocation}
              className="text-xs text-teal hover:underline flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" /> Use my current location
            </button>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Location name (e.g., Near central park)"
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      )}
    </div>
  );
}
