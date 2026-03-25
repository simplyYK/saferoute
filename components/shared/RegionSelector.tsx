"use client";
import { useState, useCallback } from "react";
import { MapPin, Crosshair, ChevronDown, Loader2, Globe, Check } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { useAppStore } from "@/store/appStore";
import { REGIONS, getRegionByCountry, type RegionConfig } from "@/lib/constants/regions";

export default function RegionSelector() {
  const viewCountry = useMapStore((s) => s.viewCountry);
  const setViewCountry = useMapStore((s) => s.setViewCountry);
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const flyTo = useMapStore((s) => s.flyTo);
  const userLocation = useAppStore((s) => s.userLocation);

  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const selectRegion = useCallback(
    (region: RegionConfig) => {
      setViewCountry(region.country);
      setCenter(region.center);
      setZoom(region.zoom);
      flyTo(region.center);
      setOpen(false);
    },
    [setViewCountry, setCenter, setZoom, flyTo]
  );

  const detectRegion = useCallback(async () => {
    setDetecting(true);
    try {
      // Use existing GPS from appStore, or request fresh
      let lat = userLocation?.lat;
      let lng = userLocation?.lng;

      if (!lat || !lng) {
        // Request GPS
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      // Reverse geocode
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = (await res.json()) as { country?: string; countryCode?: string };

      if (data.country) {
        const match = getRegionByCountry(data.country);
        if (match) {
          selectRegion(match);
        } else {
          // Country not in predefined list — set it dynamically
          setViewCountry(data.country);
          setCenter([lat!, lng!]);
          setZoom(8);
          flyTo([lat!, lng!]);
          setOpen(false);
        }
      }
    } catch (err) {
      console.error("[RegionDetect]", err);
    } finally {
      setDetecting(false);
    }
  }, [userLocation, selectRegion, setViewCountry, setCenter, setZoom, flyTo]);

  const currentRegion = REGIONS.find((r) => r.country === viewCountry);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-2.5 py-1.5 transition-colors bg-white/5"
      >
        <Globe className="w-3.5 h-3.5 text-teal shrink-0" />
        <span className="hidden sm:inline max-w-[80px] truncate">
          {currentRegion?.name ?? viewCountry}
        </span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[1500]"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-[1600] w-56 bg-[#0f172a] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
            {/* Detect location */}
            <button
              type="button"
              onClick={() => void detectRegion()}
              disabled={detecting}
              className="w-full flex items-center gap-2.5 px-3 py-3 text-sm text-teal hover:bg-teal/10 transition-colors border-b border-white/10"
            >
              {detecting ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Crosshair className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">
                {detecting ? "Detecting..." : "Detect My Region"}
              </span>
            </button>

            {/* Region list */}
            <div className="max-h-64 overflow-y-auto">
              {REGIONS.map((region) => {
                const isActive = region.country === viewCountry;
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => selectRegion(region)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-teal/15 text-teal"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left truncate">{region.name}</span>
                    {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
