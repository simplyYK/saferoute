"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Mic, MessageSquare, MicOff } from "lucide-react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";

const ChatInterface = dynamic(() => import("@/components/chat/ChatInterface"), { ssr: false });

const HIDDEN_PATHS = ["/", "/globe"];

// ─── Voice tab ───────────────────────────────────────────────────
function VoiceTab() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const userLocation = useAppStore((s) => s.userLocation);
  const centerLat = useMapStore((s) => s.center[0]);
  const centerLng = useMapStore((s) => s.center[1]);
  const viewCountry = useMapStore((s) => s.viewCountry);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const lat = userLocation?.lat ?? centerLat;
  const lng = userLocation?.lng ?? centerLng;

  if (!agentId || agentId.startsWith("sk_")) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
          <MicOff className="w-7 h-7 text-slate-600" />
        </div>
        <div>
          <p className="text-sm text-slate-300 font-medium">Voice mode not configured</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID to your agent ID<br />
            (not the API key) in .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Script
        src="https://elevenlabs.io/convai-widget/index.js"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />

      {/* ElevenLabs widget — vertically centered */}
      <div ref={widgetRef} className="flex-1 flex items-center justify-center">
        <style dangerouslySetInnerHTML={{ __html: `
          elevenlabs-convai {
            position: relative !important;
            bottom: auto !important;
            right: auto !important;
            z-index: 1 !important;
          }
          elevenlabs-convai::part(widget) {
            position: relative !important;
            bottom: auto !important;
            right: auto !important;
          }
        `}} />
        <div
          dangerouslySetInnerHTML={{
            __html: `<elevenlabs-convai agent-id="${agentId}" dynamic-variables='{"lat":"${lat}","lng":"${lng}","country":"${viewCountry}"}'></elevenlabs-convai>`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main floating button + sheet ────────────────────────────────
export default function FloatingAIButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "voice">("chat");
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();

  const hidden = HIDDEN_PATHS.includes(pathname);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined;
      if (detail) setInitialPrompt(detail);
      setTab("chat");
      setOpen(true);
    };
    const voiceHandler = () => {
      setTab("voice");
      setOpen(true);
    };
    window.addEventListener("sentinel:open-ai", handler);
    window.addEventListener("sentinel:open-voice", voiceHandler);
    return () => {
      window.removeEventListener("sentinel:open-ai", handler);
      window.removeEventListener("sentinel:open-voice", voiceHandler);
    };
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
            <span className="absolute inset-0 rounded-full border-2 border-teal/40 animate-ping" style={{ animationDuration: "3s" }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2500] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[2501] bg-[#0d1424] rounded-t-3xl shadow-2xl border-t border-teal/15 flex flex-col"
              style={{ height: "85vh" }}
            >
              {/* Header with tabs */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-teal/20 rounded-full flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-teal" />
                  </div>
                  <p className="text-sm font-semibold text-white">Sentinel AI</p>
                </div>

                {/* Chat / Voice toggle */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-0.5">
                  <button
                    onClick={() => setTab("chat")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      tab === "chat" ? "bg-teal/20 text-teal" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Chat
                  </button>
                  <button
                    onClick={() => setTab("voice")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      tab === "voice" ? "bg-teal/20 text-teal" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    Voice
                  </button>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab content */}
              {tab === "chat" ? (
                <div className="flex-1 overflow-hidden">
                  <ChatInterface initialPrompt={initialPrompt} />
                </div>
              ) : (
                <VoiceTab />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
