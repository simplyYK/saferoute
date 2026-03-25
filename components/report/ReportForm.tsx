"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  REPORT_CATEGORIES,
  SEVERITY_LEVELS,
  REPORT_EXPIRY_HOURS,
} from "@/lib/constants/report-types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createReport } from "@/lib/supabase/reports";
import type { ReportCategory, SeverityLevel } from "@/types/report";
import { CheckCircle, MapPin, Send, Loader2, ArrowLeft, Search } from "lucide-react";
import ReportLocationMap from "@/components/report/ReportLocationMap";

interface ReportFormProps {
  initialLat?: number;
  initialLng?: number;
  onSuccess?: () => void;
}

type StepNum = 1 | 2 | 3;

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = { "User-Agent": "SafeRoute/1.0 (crisis navigation)" };

export default function ReportForm({ initialLat, initialLng, onSuccess }: ReportFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepNum>(1);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(initialLat || 0);
  const [lng, setLng] = useState(initialLng || 0);
  const [locationName, setLocationName] = useState("");
  const [addrQuery, setAddrQuery] = useState("");
  const [addrBusy, setAddrBusy] = useState(false);
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
      async (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        setLat(la);
        setLng(ln);
        try {
          const res = await fetch(
            `${NOMINATIM}/reverse?lat=${la}&lon=${ln}&format=json`,
            { headers: UA }
          );
          if (res.ok) {
            const j = (await res.json()) as { display_name?: string };
            if (j.display_name) setLocationName(j.display_name);
          }
        } catch {
          /* ignore */
        }
      },
      () => setError("Location unavailable. Search for an address below.")
    );
  }, []);

  useEffect(() => {
    if (step === 3) getLocation();
  }, [step, getLocation]);

  const searchAddress = async () => {
    if (!addrQuery.trim()) return;
    setAddrBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${NOMINATIM}/search?q=${encodeURIComponent(addrQuery.trim())}&format=json&limit=1`,
        { headers: UA }
      );
      const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
      const hit = data[0];
      if (hit?.lat && hit?.lon) {
        setLat(parseFloat(hit.lat));
        setLng(parseFloat(hit.lon));
        if (hit.display_name) setLocationName(hit.display_name);
      } else {
        setError("No results for that search.");
      }
    } finally {
      setAddrBusy(false);
    }
  };

  const handleCategorySelect = (cat: ReportCategory) => {
    const catDef = REPORT_CATEGORIES.find((c) => c.id === cat);
    setCategory(cat);
    if (catDef) setSeverity(catDef.severity as SeverityLevel);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!category || !title.trim()) return;
    if (!isSupabaseConfigured) {
      setError("Set up Supabase to submit reports — see README");
      return;
    }
    if (!lat || !lng || (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)) {
      setError("Set a location using GPS or address search.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const expiryHours = REPORT_EXPIRY_HOURS[category] || 24;
      const expiresAt = new Date(Date.now() + expiryHours * 3600000).toISOString();

      await createReport({
        category,
        severity,
        title: title.trim(),
        description: description.trim() || null,
        latitude: lat,
        longitude: lng,
        location_name: locationName.trim() || null,
        reporter_id: getDeviceId(),
        language: typeof localStorage !== "undefined" ? localStorage.getItem("saferoute_language") || "en" : "en",
        expires_at: expiresAt,
        status: "active",
        confirmations: 0,
        denials: 0,
      });

      setSuccess(true);
      window.setTimeout(() => {
        onSuccess?.();
        router.push("/map");
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-2">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-green-800">✅ Report submitted!</h3>
        <p className="text-slate-600 mt-2 max-w-sm">
          It will appear on the map in seconds. Redirecting to the map…
        </p>
      </div>
    );
  }

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="space-y-4 w-full max-w-full">
      {!isSupabaseConfigured && (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-sm px-3 py-2.5"
          role="status"
        >
          Set up Supabase to submit reports — add{" "}
          <code className="text-xs bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-xs bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          to <code className="text-xs bg-amber-100 px-1 rounded">.env.local</code> and see README.
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>
            Step {step} of 3
          </span>
          <span>
            {step === 1 ? "Category" : step === 2 ? "Details" : "Location"}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 3 ? 2 : 1) as StepNum)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <span>
          {step === 1 && "Choose what you are reporting"}
          {step === 2 && "Describe the situation"}
          {step === 3 && "Confirm where it happened"}
        </span>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {REPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.id as ReportCategory)}
              className="flex flex-col items-center p-3 rounded-xl border-2 border-slate-200 hover:border-teal transition-all min-h-[80px] bg-white touch-manipulation"
            >
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span className="text-xs text-center font-medium leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && category && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
            <span className="text-xl">{REPORT_CATEGORIES.find((c) => c.id === category)?.icon}</span>
            <span className="font-medium text-sm">
              {REPORT_CATEGORIES.find((c) => c.id === category)?.label}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Severity</label>
            <div className="flex gap-2 flex-wrap">
              {SEVERITY_LEVELS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeverity(s.id as SeverityLevel)}
                  className={`text-xs px-3 py-2 rounded-full border-2 font-medium min-h-[44px] touch-manipulation ${
                    severity === s.id ? s.activeClass : "border-slate-200 text-slate-600"
                  }`}
                >
                  {s.icon} {s.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Brief description of the hazard…"
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-teal outline-none min-h-[44px]"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              placeholder="Any additional information…"
              rows={3}
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-teal outline-none resize-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            disabled={!title.trim()}
            className="w-full bg-teal text-white py-3 rounded-xl font-semibold disabled:opacity-50 min-h-[48px] touch-manipulation"
          >
            Continue to location
          </button>
        </div>
      )}

      {step === 3 && category && (
        <div className="space-y-3">
          <ReportLocationMap lat={lat} lng={lng} />

          <button
            type="button"
            onClick={getLocation}
            className="w-full flex items-center justify-center gap-2 text-sm text-teal font-medium py-2 min-h-[44px] rounded-lg border border-teal/30 bg-teal/5 touch-manipulation"
          >
            <MapPin className="w-4 h-4" />
            Use my current location
          </button>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Or search address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={addrQuery}
                onChange={(e) => setAddrQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void searchAddress()}
                placeholder="Street, neighbourhood, city…"
                className="flex-1 min-w-0 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => void searchAddress()}
                disabled={addrBusy}
                className="shrink-0 px-3 rounded-lg bg-slate-800 text-white min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              >
                {addrBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Location label (optional)</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Near central market"
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !title.trim() || !isSupabaseConfigured}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      )}
    </div>
  );
}
