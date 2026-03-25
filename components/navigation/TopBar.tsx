"use client";
import { useState } from "react";
import { RefreshCw, Menu, MapPin, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SOSButton from "@/components/shared/SOSButton";
import LocationSearch, { type LocationResult } from "@/components/shared/LocationSearch";
import AppDrawer from "@/components/navigation/AppDrawer";
import { SentinelIcon } from "@/components/shared/SentinelLogo";
import { useMapStore } from "@/store/mapStore";
import { useAppStore } from "@/store/appStore";
import { REGIONS } from "@/lib/constants/regions";

interface TopBarProps {
  extraActions?: ReactNode;
}

function RefreshButton() {
  const [spinning, setSpinning] = useState(false);
  const triggerRefresh = useMapStore((s) => s.triggerRefresh);

  const handleRefresh = () => {
    setSpinning(true);
    triggerRefresh();
    window.dispatchEvent(new CustomEvent("saferoute:refresh"));
    setTimeout(() => setSpinning(false), 1500);
  };

  return (
    <button
      onClick={handleRefresh}
      className="p-2 text-slate-500 hover:text-teal transition-colors shrink-0 rounded-lg hover:bg-white/5"
      title="Refresh all data"
      aria-label="Refresh data"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
    </button>
  );
}

function RegionPicker() {
  const [open, setOpen] = useState(false);
  const viewCountry = useMapStore((s) => s.viewCountry);
  const setViewCountry = useMapStore((s) => s.setViewCountry);
  const setCenter = useMapStore((s) => s.setCenter);
  const flyTo = useMapStore((s) => s.flyTo);
  const userLocation = useAppStore((s) => s.userLocation);

  const currentRegion = REGIONS.find(
    (r) => r.country === viewCountry || r.name === viewCountry
  );

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white bg-white/5 border border-white/8 hover:border-white/20 transition-all"
      >
        <MapPin className="w-3 h-3 text-teal" />
        <span className="max-w-[60px] truncate">{currentRegion?.name ?? viewCountry}</span>
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[1050]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-[1051] w-56 max-h-72 overflow-y-auto rounded-xl border border-white/10 shadow-2xl"
              style={{ background: "rgba(13,20,36,0.98)", backdropFilter: "blur(20px)" }}
            >
              <div className="p-1.5">
                {/* Current Location option */}
                {userLocation && (
                  <>
                    <button
                      onClick={() => {
                        setCenter([userLocation.lat, userLocation.lng]);
                        flyTo([userLocation.lat, userLocation.lng]);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-green-400 hover:bg-green-500/10 transition-all flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      My Location
                    </button>
                    <div className="border-b border-white/6 my-1" />
                  </>
                )}
                {REGIONS.map((r) => {
                  const active = r.country === viewCountry || r.name === viewCountry;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setViewCountry(r.country);
                        setCenter(r.center);
                        flyTo(r.center);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-teal/15 text-teal"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TopBar({ extraActions }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const flyTo = useMapStore((s) => s.flyTo);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelect = (result: LocationResult) => {
    flyTo([result.lat, result.lng]);
    if (!pathname.startsWith("/map") && !pathname.startsWith("/route") && !pathname.startsWith("/globe") && !pathname.startsWith("/intel")) {
      router.push("/map");
    }
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[1000] flex items-center gap-1.5 px-3 py-2 h-14"
        style={{
          background: "linear-gradient(to right, rgba(10,15,30,0.98), rgba(13,20,36,0.98))",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(14,165,233,0.1)",
          boxShadow: "0 1px 20px rgba(0,0,0,0.4)",
        }}
      >
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <SentinelIcon size={24} />
          <span className="font-bold text-white text-xs tracking-wider hidden sm:block">SENTINEL</span>
        </Link>

        <LocationSearch
          placeholder="Search location..."
          onSelect={handleSelect}
          dark
        />

        <RegionPicker />
        {extraActions}
        <RefreshButton />
        <SOSButton />

        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>
      </header>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
