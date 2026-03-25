"use client";
import dynamic from "next/dynamic";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";

const ReportForm = dynamic(() => import("@/components/report/ReportForm"), {
  ssr: false,
  loading: () => (
    <div className="py-12 text-center text-slate-500 text-sm">Loading form…</div>
  ),
});
export default function ReportPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto p-4 w-full">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-slate-900">Report a Hazard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Help your community stay safe — reports appear on the map in real-time.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <ReportForm />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
