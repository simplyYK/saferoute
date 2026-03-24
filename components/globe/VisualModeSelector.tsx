"use client";

import { useAppStore, type GlobeVisualMode } from "@/store/appStore";
import { cn } from "@/lib/utils/cn";

const MODES: { id: GlobeVisualMode; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "flir", label: "FLIR" },
  { id: "night", label: "Night Vision" },
  { id: "crt", label: "CRT" },
];

export default function VisualModeSelector() {
  const mode = useAppStore((s) => s.globeVisualMode);
  const setMode = useAppStore((s) => s.setGlobeVisualMode);

  return (
    <div
      className={cn(
        "absolute top-16 left-3 z-[600] flex flex-wrap gap-1.5 max-w-[min(100%,360px)]",
        mode === "crt" && "crt-mode-ui"
      )}
    >
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMode(id)}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all border",
            mode === id
              ? "border-teal bg-teal/20 text-teal shadow-[0_0_12px_rgba(14,165,233,0.45)]"
              : "border-white/15 bg-black/40 text-slate-300 hover:border-white/30"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
