"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Loader2, Volume2, X } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";

type ConvMode = "listening" | "speaking";
type ConvStatus = "idle" | "connecting" | "connected" | "error";

interface ConvInstance {
  endSession: () => Promise<void>;
  getInputVolume: () => number;
  getOutputVolume: () => number;
  getInputByteFrequencyData: () => Uint8Array;
  getOutputByteFrequencyData: () => Uint8Array;
}

const BAR_COUNT = 72;
const IDLE_FREQS = Array.from({ length: BAR_COUNT }, (_, i) =>
  0.0004 + ((i * 0.618033988749895) % 1) * 0.0025
);
const IDLE_PHASES = Array.from({ length: BAR_COUNT }, (_, i) =>
  (i * 1.6180339887498949 * Math.PI) % (Math.PI * 2)
);

function VoiceVisualizer({
  mode,
  status,
  convRef,
}: {
  mode: ConvMode;
  status: ConvStatus;
  convRef: React.RefObject<ConvInstance | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedRef = useRef(new Float32Array(BAR_COUNT));
  const rafRef = useRef(0);
  const modeRef = useRef(mode);
  const statusRef = useRef(status);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 240;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    ctx.scale(dpr, dpr);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const BASE_R = SIZE * 0.3;
    const MAX_BAR = SIZE * 0.19;
    const smoothed = smoothedRef.current;

    const getFreqBars = (): Float32Array => {
      const conv = convRef.current;
      if (!conv || statusRef.current !== "connected") return new Float32Array(BAR_COUNT);
      try {
        const raw =
          modeRef.current === "listening"
            ? conv.getInputByteFrequencyData()
            : conv.getOutputByteFrequencyData();
        if (!raw || raw.length === 0) return new Float32Array(BAR_COUNT);
        const result = new Float32Array(BAR_COUNT);
        const step = raw.length / BAR_COUNT;
        for (let i = 0; i < BAR_COUNT; i++) {
          result[i] = (raw[Math.floor(i * step)] ?? 0) / 255;
        }
        return result;
      } catch {
        return new Float32Array(BAR_COUNT);
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const t = Date.now();
      const s = statusRef.current;
      const m = modeRef.current;
      const isConnected = s === "connected";
      const isConnecting = s === "connecting";

      const [cr, cg, cb] = m === "speaking" ? [14, 165, 233] : [20, 184, 166];
      const colorStr = `${cr},${cg},${cb}`;

      const freqBars = isConnected ? getFreqBars() : new Float32Array(BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        let target: number;
        if (isConnected) {
          target = freqBars[i] * MAX_BAR;
        } else if (isConnecting) {
          const wave = Math.sin(t * 0.004 + (i / BAR_COUNT) * Math.PI * 6) * 0.5 + 0.5;
          target = wave * MAX_BAR * 0.07;
        } else {
          target =
            Math.abs(Math.sin(t * IDLE_FREQS[i] + IDLE_PHASES[i])) * MAX_BAR * 0.045;
        }
        smoothed[i] += (target - smoothed[i]) * 0.22;
      }

      let vol = 0;
      if (isConnected && convRef.current) {
        try {
          vol =
            m === "listening"
              ? convRef.current.getInputVolume()
              : convRef.current.getOutputVolume();
        } catch { /* ignore */ }
      }

      ctx.lineCap = "round";
      for (let i = 0; i < BAR_COUNT; i++) {
        const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
        const bh = Math.max(smoothed[i], 1.2);
        const alpha = isConnected
          ? 0.45 + (smoothed[i] / MAX_BAR) * 0.55
          : isConnecting ? 0.28 : 0.1;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * BASE_R, cy + Math.sin(angle) * BASE_R);
        ctx.lineTo(cx + Math.cos(angle) * (BASE_R + bh), cy + Math.sin(angle) * (BASE_R + bh));
        ctx.strokeStyle = `rgba(${colorStr},${alpha})`;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, BASE_R - 1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${colorStr},${isConnected ? 0.22 : 0.05})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      const breathe = 0.88 + Math.sin(t * 0.0013) * 0.05;
      const orbR =
        BASE_R * 0.6 * (s === "idle" ? breathe : 1) * (isConnected ? 1 + vol * 0.2 : 1);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
      grd.addColorStop(0, `rgba(${colorStr},${isConnected ? 0.38 : 0.09})`);
      grd.addColorStop(0.5, `rgba(${colorStr},${isConnected ? 0.13 : 0.03})`);
      grd.addColorStop(1, `rgba(${colorStr},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, SIZE * 0.093, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${colorStr},${isConnected ? 0.48 : 0.16})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvasRef} />;
}

export default function VoiceMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const userLocation = useAppStore((s) => s.userLocation);
  const centerLat = useMapStore((s) => s.center[0]);
  const centerLng = useMapStore((s) => s.center[1]);
  const viewCountry = useMapStore((s) => s.viewCountry);

  const lat = userLocation?.lat ?? centerLat;
  const lng = userLocation?.lng ?? centerLng;

  const [status, setStatus] = useState<ConvStatus>("idle");
  const [mode, setMode] = useState<ConvMode>("listening");
  const [error, setError] = useState<string | null>(null);
  const convRef = useRef<ConvInstance | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const start = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const { Conversation } = await import("@elevenlabs/client");
      const conv = await Conversation.startSession({
        agentId: agentId!,
        connectionType: "websocket",
        dynamicVariables: {
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5)),
          country: viewCountry ?? "Unknown",
        },
        onModeChange: ({ mode: m }: { mode: string }) => setMode(m as ConvMode),
        onStatusChange: ({ status: s }: { status: string }) => {
          if (s === "disconnected" || s === "disconnecting") setStatus("idle");
        },
        onError: (msg: unknown) => {
          setError(typeof msg === "string" ? msg : "Connection error");
          setStatus("error");
        },
      });
      convRef.current = conv as unknown as ConvInstance;
      setStatus("connected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setStatus("error");
    }
  }, [agentId, lat, lng, viewCountry]);

  const stop = useCallback(async () => {
    if (convRef.current) {
      try { await convRef.current.endSession(); } catch { /* ignore */ }
      convRef.current = null;
    }
    setStatus("idle");
    setMode("listening");
  }, []);

  // Stop session when modal closes
  useEffect(() => {
    if (!open) void stop();
  }, [open, stop]);

  useEffect(() => () => { void stop(); }, [stop]);

  const statusLabel =
    status === "idle"
      ? "Tap to start voice session"
      : status === "connecting"
      ? "Connecting to Sentinel AI…"
      : status === "connected"
      ? mode === "listening" ? "Listening…" : "Sentinel AI speaking…"
      : (error ?? "Connection failed — tap to retry");

  return (
    <AnimatePresence>
      {open && (
        <>
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
            className="fixed inset-x-4 top-[12%] z-[3001] max-w-md mx-auto bg-[#0d1424] border border-teal/30 rounded-3xl shadow-2xl overflow-hidden"
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

            <div className="flex flex-col items-center gap-5 px-6 py-8">
              {agentId && !agentId.startsWith("sk_") ? (
                <>
                  <VoiceVisualizer mode={mode} status={status} convRef={convRef} />

                  <p className={`text-sm font-medium text-center transition-colors duration-300 ${
                    status === "error" ? "text-red-400" :
                    status === "connected" && mode === "speaking" ? "text-sky-400" :
                    status === "connected" ? "text-teal-400" :
                    status === "connecting" ? "text-teal-500" :
                    "text-slate-500"
                  }`}>
                    {statusLabel}
                  </p>

                  {status === "idle" || status === "error" ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={start}
                      className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-teal/20 border border-teal/40 text-teal font-semibold text-sm hover:bg-teal/30 transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      Start Voice Session
                    </motion.button>
                  ) : status === "connecting" ? (
                    <div className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-teal" />
                      Connecting…
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={stop}
                      className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/20 transition-all"
                    >
                      <PhoneOff className="w-4 h-4" />
                      End Session
                    </motion.button>
                  )}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <MicOff className="w-7 h-7 text-slate-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300 font-medium">Voice mode not configured</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Add NEXT_PUBLIC_ELEVENLABS_AGENT_ID to .env.local
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
