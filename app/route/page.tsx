"use client";
import dynamic from "next/dynamic";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import RoutePlanner from "@/components/route/RoutePlanner";

const CrisisMap = dynamic(() => import("@/components/map/CrisisMap"), { ssr: false });

export default function RoutePage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 flex overflow-hidden">
        {/* Map takes 60% on large screens */}
        <div className="hidden lg:flex flex-1 relative">
          <CrisisMap />
        </div>
        {/* Route planner panel */}
        <div className="w-full lg:w-96 flex flex-col overflow-hidden border-l border-slate-200">
          <RoutePlanner />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
