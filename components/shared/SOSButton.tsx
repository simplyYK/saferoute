"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Phone, Copy, Check, X, ArrowLeft, Share2 } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { REGIONS, type RegionConfig } from "@/lib/constants/regions";

export default function SOSButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const viewCountry = useMapStore((s) => s.viewCountry);

  const region: RegionConfig | undefined = REGIONS.find(
    (r) => r.country === viewCountry || r.name === viewCountry
  );

  const emergencyNumbers = [
    ...(region?.emergencyNumbers ?? []),
    { label: "ICRC (International)", number: "+41227346001" },
    { label: "UNHCR Emergency", number: "+41227398111" },
  ];

  const handleSOS = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setCoords(null);
    } finally {
      setLoading(false);
    }
  };

  const emergencyMessage = coords
    ? `EMERGENCY: I need help!\nLocation: https://maps.google.com/?q=${coords.lat},${coords.lng}\nRegion: ${viewCountry}\nTime: ${new Date().toISOString()}`
    : `EMERGENCY: I need help! Region: ${viewCountry} (Location unavailable)`;

  const shareLocation = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Emergency SOS", text: emergencyMessage }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(emergencyMessage);
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

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 p-4 pt-20 overflow-y-auto">
          <div className="bg-[#0d1424] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-red-500/30 max-h-[calc(100vh-6rem)]">
            {/* Header with close */}
            <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Close SOS"
                >
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <h2 className="text-lg font-bold text-white">Emergency SOS</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Location */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/8">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Your Location</p>
                {loading ? (
                  <p className="text-sm text-slate-400 animate-pulse">Getting GPS...</p>
                ) : coords ? (
                  <p className="font-mono text-sm text-white">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
                ) : (
                  <p className="text-sm text-amber-400">Location unavailable — enable GPS</p>
                )}
              </div>

              {/* Emergency numbers */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Emergency Numbers {region ? `— ${region.name}` : ""}
                </p>
                <div className="space-y-1.5">
                  {emergencyNumbers.map(({ label, number }) => (
                    <a
                      key={number}
                      href={`tel:${number}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/10 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{number}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Share button */}
              <button
                onClick={shareLocation}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors min-h-[52px]"
              >
                {copied ? <Check className="w-5 h-5" /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "Copied to clipboard!" : "Share Emergency Location"}
              </button>

              {/* Back to safety */}
              <button
                onClick={() => setOpen(false)}
                className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors"
              >
                Close and return to app
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
