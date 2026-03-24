"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Video } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CAMERAS = [1000, 1001, 1002, 1003, 1004] as const;

function cameraUrl(id: (typeof CAMERAS)[number], t: number) {
  return `https://cctv.austinmobility.io/image/${id}.jpg?t=${t}`;
}

export default function CCTVPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedId, setExpandedId] = useState<(typeof CAMERAS)[number] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      className={cn(
        "absolute bottom-16 left-0 z-[550] max-w-[min(100vw,320px)] transition-all duration-200",
        collapsed ? "w-11" : "w-[min(100vw,320px)]"
      )}
    >
      <div className="flex items-stretch gap-0">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 w-8 rounded-r-lg bg-black/50 border border-l-0 border-white/10 text-slate-300 flex items-center justify-center hover:bg-black/60"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand CCTV panel" : "Collapse CCTV panel"}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        <div
          className={cn(
            "flex-1 min-w-0 bg-black/45 backdrop-blur-md border border-white/10 rounded-r-lg overflow-hidden",
            collapsed && "hidden"
          )}
        >
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/10">
            <Video className="w-4 h-4 text-teal shrink-0" />
            <span className="font-semibold text-xs text-white tracking-wide">Live CCTV</span>
            <span className="relative flex h-2 w-2 ml-auto" aria-hidden>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          </div>
          <p className="text-[10px] text-slate-400 px-2.5 py-1.5 border-b border-white/5 leading-snug">
            Public infrastructure cameras — not from conflict zones (demo only).
          </p>
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {CAMERAS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setExpandedId((e) => (e === id ? null : id))}
                className="relative rounded-md overflow-hidden border border-white/10 bg-black/40 aspect-video text-left focus:outline-none focus:ring-2 focus:ring-teal/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cameraUrl(id, tick)}
                  alt={`Austin camera ${id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-0.5 left-0.5 right-0.5 flex items-center gap-1 text-[9px] text-white/90 bg-black/55 px-1 py-0.5 rounded">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  Austin TX · Live
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {expandedId != null && (
        <button
          type="button"
          className="fixed inset-0 z-[600] bg-black/80 flex items-center justify-center p-4 border-0 cursor-default"
          onClick={() => setExpandedId(null)}
          aria-label="Close expanded camera"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cameraUrl(expandedId, tick)}
            alt={`Austin camera ${expandedId} full size`}
            className="max-w-full max-h-[85vh] rounded-lg border border-white/20 shadow-2xl cursor-zoom-out"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      )}
    </aside>
  );
}
