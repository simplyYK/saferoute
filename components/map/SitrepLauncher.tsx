"use client";

import { useState, useCallback } from "react";
import { FileText, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useMapStore } from "@/store/mapStore";
import { useReports } from "@/hooks/useReports";
import { useConflictData } from "@/hooks/useConflictData";
import { useAppStore } from "@/store/appStore";

interface LiveStats {
  flightCount: number;
  seismic24h: number;
}

export default function SitrepLauncher() {
  const { viewCountry } = useMapStore();
  const { language } = useAppStore();
  const { reports } = useReports();
  const { events } = useConflictData(viewCountry);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  const generate = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    setText("");

    let flightCount = 0;
    let seismic24h = 0;
    try {
      const ls = await fetch("/api/live-stats");
      if (ls.ok) {
        const j = (await ls.json()) as LiveStats;
        flightCount = j.flightCount;
        seismic24h = j.seismic24h;
      }
    } catch {
      /* use zeros */
    }

    const prompt = `Generate a concise military-style situation report (SITREP) based on the current data: [${
      events.length
    } conflict events], [${reports.length} active reports], [${seismic24h} seismic events in last 24h], [approximately ${flightCount} aircraft states in global OpenSky snapshot — describe only as aggregate traffic, not targeting]. Format: LOCATION · THREAT LEVEL · RECOMMENDATION · PRIORITY ACTIONS.`;

    try {
      const res = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          language,
          context: {
            country: viewCountry,
            conflictEventCount: events.length,
            activeReports: reports.length,
            recentSeismic24h: seismic24h,
            flightSnapshotCount: flightCount,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as { content?: string };
              if (parsed.content) {
                full += parsed.content;
                setText(full);
              }
            } catch {
              /* skip */
            }
          }
        }
      }
    } catch (e) {
      setText(e instanceof Error ? e.message : "Failed to generate SITREP.");
    } finally {
      setLoading(false);
    }
  }, [events.length, reports.length, viewCountry, language]);

  return (
    <>
      <button
        type="button"
        onClick={() => void generate()}
        className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-amber-200 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-500/30 rounded-lg px-2 py-1.5 sm:px-2.5 shrink-0"
      >
        <FileText className="w-3.5 h-3.5" />
        SITREP
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/60 p-4 pt-20 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sitrep-title"
        >
          <div className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-xl bg-[#f4f1e4] text-[#1a1a12] shadow-2xl border-4 border-[#4a4536] font-mono text-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#4a4536] bg-[#e8e4d4]">
              <div>
                <p id="sitrep-title" className="font-bold text-xs tracking-[0.2em] text-[#5c5444]">
                  CLASSIFIED // SITUATION REPORT
                </p>
                <p className="text-[10px] text-[#7a7260] mt-0.5">
                  {viewCountry} · {new Date().toISOString().slice(0, 16).replace("T", " ")}Z
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-black/10 text-[#4a4536]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 prose prose-sm max-w-none prose-p:my-2 prose-headings:text-[#1a1a12]">
              {loading && !text ? (
                <div className="flex items-center gap-2 text-[#5c5444]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </div>
              ) : (
                <ReactMarkdown>{text || "—"}</ReactMarkdown>
              )}
            </div>
            <div className="px-4 py-2 border-t border-[#c4bfb0] text-[10px] text-[#7a7260]">
              For coordination only · verify all intelligence against primary sources
            </div>
          </div>
        </div>
      )}
    </>
  );
}
