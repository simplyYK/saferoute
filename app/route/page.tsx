"use client";
import { Suspense, useEffect, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import RoutePlanner from "@/components/route/RoutePlanner";
import { useAppStore } from "@/store/appStore";

const CrisisMap = dynamic(() => import("@/components/map/CrisisMap"), { ssr: false });

export default function RoutePage() {
  const visualMode = useAppStore((s) => s.visualMode);

  useEffect(() => {
    document.documentElement.classList.toggle("crt-mode", visualMode === "crt");
    document.documentElement.classList.toggle("blackout-mode", visualMode === "blackout");
    return () => {
      document.documentElement.classList.remove("crt-mode");
      document.documentElement.classList.remove("blackout-mode");
    };
  }, [visualMode]);

  const filterStyle: CSSProperties | undefined =
    visualMode === "flir"
      ? { filter: "saturate(0%) brightness(1.5) contrast(2)" }
      : visualMode === "night"
        ? { filter: "saturate(0%) brightness(1.2) contrast(1.3)" }
        : visualMode === "blackout"
          ? { filter: "saturate(0%) brightness(0.3) contrast(3)" }
          : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0f1e]">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 flex overflow-hidden">
        {/* Map with visual filters */}
        <div className="hidden lg:flex flex-1 relative">
          <div className="absolute inset-0" style={filterStyle}>
            {visualMode === "night" && (
              <div className="absolute inset-0 pointer-events-none z-[450]" style={{ background: "rgba(0, 255, 70, 0.12)" }} />
            )}
            <Suspense fallback={null}>
              <CrisisMap />
            </Suspense>
          </div>
        </div>
        {/* Route planner panel */}
        <div className="w-full lg:w-[420px] flex flex-col overflow-hidden border-l border-white/8">
          <Suspense fallback={null}>
            <RoutePlanner />
          </Suspense>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
