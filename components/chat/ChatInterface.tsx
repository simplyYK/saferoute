"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Bot, Trash2, AlertTriangle, Plane, Activity, MapPin, Car, Phone, Route, Wifi, WifiOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import type { ChatMessage } from "@/types/map";

const QUICK_ACTIONS = [
  { icon: AlertTriangle, label: "Active threats", prompt: "What are the active threats near my current location right now? Give me a threat assessment." },
  { icon: Plane,        label: "Aircraft overhead", prompt: "What aircraft are currently in the region? Any military activity I should know about?" },
  { icon: Activity,    label: "Seismic spikes",    prompt: "Are there any recent seismic spikes near me? Could any be related to artillery or explosions?" },
  { icon: MapPin,      label: "Nearest hospital",  prompt: "Where is the nearest hospital or medical facility to my current location?" },
  { icon: Car,         label: "Evacuation route",  prompt: "What is the safest evacuation route from my current location? Which direction should I move?" },
  { icon: Phone,       label: "Emergency contacts", prompt: "What are the emergency contacts, hotlines, and humanitarian organizations for my region?" },
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "I'm your **SafeRoute intelligence analyst**.\n\nI have access to live conflict data, flight tracking, seismic activity, and your location. Ask me about threats, evacuation routes, medical help, or resources.\n\n**Stay concise. Stay safe.**",
  timestamp: new Date(),
};

export default function ChatInterface({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { language, userLocation } = useAppStore();
  const { viewCountry, center, bounds } = useMapStore();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [seismicCount, setSeismicCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/seismic");
        if (res.ok && !cancelled) {
          const d = await res.json() as { events?: unknown[] };
          setSeismicCount(d.events?.length ?? 0);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Abort stream on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const buildContext = useCallback(() => {
    const ctx: Record<string, unknown> = {
      country: viewCountry,
      mapCenter: { lat: center[0], lng: center[1] },
      mapBounds: bounds,
      recentSeismic: seismicCount,
    };
    if (userLocation) {
      ctx.userGPS = { lat: userLocation.lat, lng: userLocation.lng };
      ctx.locationNote = `User's exact GPS coordinates: ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}. Use these coordinates to give precise nearby hospital/shelter/route recommendations.`;
    }
    return ctx;
  }, [viewCountry, center, bounds, seismicCount, userLocation]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      inputRef.current?.blur();

      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text.trim(), timestamp: new Date() };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setLoading(true);

      const history = [...messages.filter((m) => m.id !== "welcome"), userMsg].map((m) => ({
        role: m.role, content: m.content,
      }));

      try {
        abortRef.current = new AbortController();
        const res = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, language, context: buildContext() }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let full = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value, { stream: true }).split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data) as { content?: string };
                if (parsed.content) {
                  full += parsed.content;
                  setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: full } : m));
                }
              } catch { /* skip */ }
            }
          }
        }
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${errMsg}\n\nPlease try again.`, isStreaming: false } : m)
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, language, buildContext]
  );

  const clear = () => { abortRef.current?.abort(); setMessages([WELCOME]); setLoading(false); };

  const hasLocation = !!userLocation;

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-navy text-white gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-5 h-5 text-teal shrink-0" />
          <h2 className="font-semibold text-sm truncate">Intelligence Analyst</h2>
          <span className="hidden sm:inline-flex items-center rounded-full border border-teal/40 bg-teal/10 text-teal text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shrink-0">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push("/route")}
            className="hidden sm:flex items-center gap-1 text-[11px] text-slate-300 hover:text-teal border border-white/20 hover:border-teal/40 rounded-lg px-2 py-1 transition-colors"
          >
            <Route className="w-3 h-3" />
            Plan Route
          </button>
          <button onClick={clear} className="p-1.5 hover:text-slate-300 transition-colors" aria-label="Clear chat">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
        <span className="flex items-center gap-1">
          {hasLocation ? (
            <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-600 font-medium">GPS Active</span></>
          ) : (
            <><WifiOff className="w-3 h-3 text-amber-500" /><span className="text-amber-600">No GPS — enable location for precise results</span></>
          )}
        </span>
        {viewCountry && <span className="text-slate-400">·</span>}
        {viewCountry && <span>Region: {viewCountry}</span>}
        {seismicCount > 0 && <><span className="text-slate-400">·</span><span>🌍 {seismicCount} seismic (24h)</span></>}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-navy flex items-center justify-center shrink-0 mr-2 mt-1">
                <Bot className="w-3.5 h-3.5 text-teal" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-teal text-white rounded-br-sm"
                  : "bg-slate-100 text-slate-900 rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-slate-900">
                  <ReactMarkdown>{msg.content || (msg.isStreaming ? "▋" : "")}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-navy flex items-center justify-center shrink-0 mr-2 mt-1">
              <Bot className="w-3.5 h-3.5 text-teal" />
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-teal" />
            </div>
          </div>
        )}
      </div>

      {/* Quick actions — only shown at start */}
      {messages.length <= 2 && !loading && (
        <div className="px-4 pb-2 shrink-0">
          <p className="text-[11px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Quick Actions</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                type="button"
                onClick={() => void sendMessage(prompt)}
                className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border border-slate-200 hover:border-teal hover:bg-teal/5 hover:text-teal transition-all text-left text-slate-600"
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-teal" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t bg-white shrink-0 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendMessage(input)}
          placeholder={hasLocation ? "Ask about threats, routes, hospitals…" : "Ask anything… (enable GPS for location-aware answers)"}
          disabled={loading}
          className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal disabled:opacity-50 min-h-[48px]"
        />
        <button
          type="button"
          onClick={() => void sendMessage(input)}
          disabled={!input.trim() || loading}
          className="bg-teal hover:bg-sky-500 text-white p-3 rounded-xl disabled:opacity-40 min-w-[48px] min-h-[48px] flex items-center justify-center transition-colors"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
