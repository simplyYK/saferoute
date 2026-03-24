"use client";
import { useState } from "react";
import { Phone, Copy, Check, X } from "lucide-react";

export default function SOSButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleSOS = async () => {
    setOpen(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setCoords(null);
    }
  };

  const copyMessage = async () => {
    const msg = coords
      ? `🆘 EMERGENCY: I need help!\nLocation: https://maps.google.com/?q=${coords.lat},${coords.lng}\nTime: ${new Date().toISOString()}`
      : "🆘 EMERGENCY: I need help! (Location unavailable)";

    if (navigator.share) {
      await navigator.share({ title: "Emergency SOS", text: msg }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={handleSOS}
        className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-full text-sm min-w-[56px] min-h-[44px] animate-pulse"
        aria-label="Emergency SOS"
      >
        SOS
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-red-600">🆘 Emergency SOS</h2>
              <button onClick={() => setOpen(false)} className="p-1">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {coords && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                <p className="font-medium text-slate-600">Your Location:</p>
                <p className="font-mono text-slate-900">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <p className="text-sm font-semibold text-slate-700">Emergency Numbers:</p>
              {[
                { label: "112 — General Emergency (EU/Ukraine)", href: "tel:112" },
                { label: "101 — Fire (Ukraine)", href: "tel:101" },
                { label: "103 — Ambulance (Ukraine)", href: "tel:103" },
                { label: "ICRC: +41 22 734 60 01", href: "tel:+41227346001" },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {label}
                </a>
              ))}
            </div>

            <button
              onClick={copyMessage}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Share Emergency Location"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
