"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Volume2 } from "lucide-react";
import Script from "next/script";

export default function VoiceMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {agentId && (
            <Script
              src="https://elevenlabs.io/convai-widget/index.js"
              strategy="lazyOnload"
              onLoad={() => setScriptLoaded(true)}
            />
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-x-4 top-[15%] z-[3001] max-w-md mx-auto bg-[#0d1424] border border-teal/30 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-teal" />
                <span className="font-bold text-white text-sm">Voice Mode</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 min-h-[300px] flex items-center justify-center">
              {agentId ? (
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{
                    __html: `<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>`,
                  }}
                />
              ) : (
                <div className="text-center">
                  <Mic className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-sm text-slate-400">
                    Voice mode requires ElevenLabs setup
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Add NEXT_PUBLIC_ELEVENLABS_AGENT_ID to .env.local
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
