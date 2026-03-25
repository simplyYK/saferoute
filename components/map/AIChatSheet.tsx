"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GripHorizontal, Bot } from "lucide-react";
import dynamic from "next/dynamic";

const ChatInterface = dynamic(() => import("@/components/chat/ChatInterface"), { ssr: false });

interface AIChatSheetProps {
  open: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export default function AIChatSheet({ open, onClose, initialPrompt }: AIChatSheetProps) {
  const startY = useRef(0);
  const dragging = useRef(false);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    startY.current = "touches" in e ? e.touches[0]!.clientY : e.clientY;
    dragging.current = true;
  };

  const handleDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging.current) return;
    const endY = "changedTouches" in e ? e.changedTouches[0]!.clientY : e.clientY;
    if (endY - startY.current > 80) onClose();
    dragging.current = false;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[901] bg-[#0d1424] rounded-t-3xl shadow-2xl border-t border-white/8"
            style={{ height: "82vh" }}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
          >
            {/* Drag handle */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-teal" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Crisis AI Assistant</p>
                  <p className="text-[10px] text-slate-400">18 live data tools</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GripHorizontal className="w-4 h-4 text-slate-600" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Chat content */}
            <div className="flex-1 overflow-hidden" style={{ height: "calc(100% - 60px)" }}>
              <ChatInterface initialPrompt={initialPrompt} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
