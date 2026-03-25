"use client";

import { useAppStore, type VisualMode } from "@/store/appStore";
import { Sun, Flame, Moon, Tv, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MODES: { id: VisualMode; label: string; icon: typeof Sun }[] = [
  { id: "standard", label: "Standard", icon: Sun },
  { id: "flir", label: "FLIR", icon: Flame },
  { id: "night", label: "NVG", icon: Moon },
  { id: "crt", label: "CRT", icon: Tv },
  { id: "blackout", label: "Blackout", icon: EyeOff },
];

export default function VisualModeSelector() {
  const { visualMode, setVisualMode } = useAppStore();
  const [open, setOpen] = useState(false);

  const current = MODES.find((m) => m.id === visualMode);
  const CurrentIcon = current?.icon ?? Sun;

  return (
    <div className="absolute top-3 right-3 z-[500]">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all"
        style={{
          background: "rgba(13,20,36,0.9)",
          borderColor: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
        }}
        aria-expanded={open}
        aria-label="Visual mode"
      >
        <CurrentIcon className="w-3 h-3 text-teal" />
        <span className="text-slate-300">{current?.label}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[499]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-[500] rounded-xl border border-white/10 p-1.5 w-40 shadow-2xl"
              style={{ background: "rgba(13,20,36,0.98)", backdropFilter: "blur(20px)" }}
            >
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setVisualMode(id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 text-left text-xs px-2.5 py-2 rounded-lg transition-all ${
                    visualMode === id
                      ? "bg-teal/15 text-teal font-semibold"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
