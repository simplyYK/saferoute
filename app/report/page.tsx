"use client";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import ReportForm from "@/components/report/ReportForm";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export default function ReportPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="px-4 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Report a Hazard</h1>
                <p className="text-xs text-slate-400">Appears on the map in real-time</p>
              </div>
            </div>
          </div>
          <ReportForm onSuccess={() => router.push("/map")} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
