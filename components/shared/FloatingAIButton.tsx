"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X } from "lucide-react";
import dynamic from "next/dynamic";

const ChatInterface = dynamic(() => import("@/components/chat/ChatInterface"), { ssr: false });

// Hide the FAB on the landing page and the globe embed
const HIDDEN_PATHS = ["/", "/globe"];

export default function FloatingAIButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();

  const hidden = HIDDEN_PATHS.includes(pathname);

  // Listen for external open events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined;
      if (detail) setInitialPrompt(detail);
      setOpen(true);
    };
    window.addEventListener("sentinel:open-ai", handler);
    return () => window.removeEventListener("sentinel:open-ai", handler);
  }, []);

  useEffect(() => {
    if (!open) setInitialPrompt(undefined);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && open) setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && !hidden && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[76px] right-4 z-[800] w-12 h-12 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
              boxShadow: "0 4px 20px rgba(14,165,233,0.4)",
            }}
            aria-label="Open AI Assistant"
          >
            <Bot className="w-5 h-5 text-white" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full border-2 border-teal/40 animate-ping" style={{ animationDuration: "3s" }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[901] bg-[#0d1424] rounded-t-3xl shadow-2xl border-t border-teal/15 flex flex-col"
              style={{ height: "82vh" }}
            >
              <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-teal/20 rounded-full flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-teal" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Sentinel AI</p>
                    <p className="text-[10px] text-slate-500">18 live intelligence tools</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatInterface initialPrompt={initialPrompt} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
