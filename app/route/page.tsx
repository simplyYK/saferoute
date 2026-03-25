"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import RoutePlanner, { type InitialPlace } from "@/components/route/RoutePlanner";

const CrisisMap = dynamic(() => import("@/components/map/CrisisMap"), { ssr: false });

function RoutePageInner() {
  const searchParams = useSearchParams();

  const initialDestination = useMemo((): InitialPlace | null => {
    const lat = searchParams.get("destLat");
    const lng = searchParams.get("destLng");
    const name = searchParams.get("destName");
    if (!lat || !lng) return null;
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
    return {
      lat: la,
      lng: ln,
      name: name ? decodeURIComponent(name) : "Destination",
    };
  }, [searchParams]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <div className="h-[38vh] min-h-[200px] shrink-0 lg:h-auto lg:flex-1 lg:min-h-0 relative border-b lg:border-b-0 lg:border-r border-slate-200">
          <div className="absolute inset-0">
            <CrisisMap mapStyle={{ height: "100%", width: "100%" }} />
          </div>
        </div>
        <div className="flex-1 min-h-0 w-full lg:w-96 lg:max-w-md flex flex-col overflow-hidden border-l border-slate-200 bg-white">
          <RoutePlanner initialDestination={initialDestination} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default function RoutePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex flex-col">
          <TopBar />
          <div className="flex-1 mt-14 mb-14 flex items-center justify-center text-slate-500 text-sm">
            Loading route planner…
          </div>
          <BottomNav />
        </div>
      }
    >
      <RoutePageInner />
    </Suspense>
  );
}
