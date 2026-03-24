"use client";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import ReportForm from "@/components/report/ReportForm";
import { useRouter } from "next/navigation";

export default function ReportPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-slate-900">Report a Hazard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Help your community stay safe — reports appear on the map in real-time.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <ReportForm onSuccess={() => router.push("/map")} />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
