"use client";

import { useAppStore, type VisualMode } from "@/store/appStore";
import { Sun, Flame, Moon, Tv } from "lucide-react";
import { useState } from "react";

const MODES: { id: VisualMode; label: string; icon: typeof Sun }[] = [
  { id: "standard", label: "Standard", icon: Sun },
  { id: "flir", label: "FLIR", icon: Flame },
  { id: "night", label: "NVG", icon: Moon },
  { id: "crt", label: "CRT", icon: Tv },
];

export default function VisualModeSelector() {
  const { visualMode, setVisualMode } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-16 left-3 z-[600]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="bg-navy/90 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg border border-white/10 flex items-center gap-2"
        aria-expanded={open}
        aria-label="Visual mode"
      >
        <span className="hidden sm:inline">View</span>
        <span className="opacity-80">{MODES.find((m) => m.id === visualMode)?.label}</span>
      </button>
      {open && (
        <div className="mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-1 w-44">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setVisualMode(id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 text-left text-sm px-2 py-2 rounded-lg transition-colors ${
                visualMode === id ? "bg-teal/15 text-teal font-medium" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
