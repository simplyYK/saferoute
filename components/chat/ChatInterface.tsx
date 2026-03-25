"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, Trash2, AlertTriangle, Plane, Activity, MapPin, Car, Phone } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import type { ChatMessage } from "@/types/map";

const QUICK_ACTIONS = [
  { icon: AlertTriangle, label: "Active threats", prompt: "What are the active threats near my location right now?" },
  { icon: Plane, label: "Aircraft overhead", prompt: "What aircraft are currently overhead? Any military activity?" },
  { icon: Activity, label: "Seismic spikes", prompt: "Are there any recent seismic spikes? Could they be artillery?" },
  { icon: MapPin, label: "Nearest hospital", prompt: "Where is the nearest hospital or shelter in my area?" },
  { icon: Car, label: "Evacuation route", prompt: "What is the safest evacuation route from my current location?" },
  { icon: Phone, label: "Emergency contacts", prompt: "What are the emergency contacts and organizations for this region?" },
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "I'm your **SafeRoute intelligence analyst**. Ask about threats, movement, triage, resources, or evacuation — I'll use the live context loaded from your session.\n\nStay concise. Stay safe.",
  timestamp: new Date(),
};

export default function ChatInterface({ className = "" }: { className?: string }) {
  const { language } = useAppStore();
  const { viewCountry, center, bounds } = useMapStore();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [seismicCount, setSeismicCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  const buildContext = useCallback(() => ({
    country: viewCountry,
    mapCenter: { lat: center[0], lng: center[1] },
    mapBounds: bounds,
    recentSeismic: seismicCount,
  }), [viewCountry, center, bounds, seismicCount]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

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
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let full = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data) as { content?: string };
                if (parsed.content) {
                  full += parsed.content;
                  setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)));
                }
              } catch { /* skip */ }
            }
          }
        }
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${errMsg}\n\nPlease try again.`, isStreaming: false } : m)
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, language, buildContext]
  );

  const clear = () => setMessages([WELCOME]);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-navy text-white gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-5 h-5 text-teal shrink-0" />
          <h2 className="font-semibold truncate">Intelligence Assistant</h2>
          <span className="hidden md:inline-flex items-center rounded-full border border-teal/40 bg-teal/10 text-teal text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shrink-0">
            Intelligence Mode
          </span>
        </div>
        <button onClick={clear} className="p-1 hover:text-slate-300 transition-colors shrink-0" aria-label="Clear chat">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Live summary */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500">
        {viewCountry && <span>Region: {viewCountry}</span>}
        {seismicCount > 0 && <span className="ml-3">🌍 {seismicCount} seismic events (24h)</span>}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user" ? "bg-teal text-white" : "bg-slate-100 text-slate-900"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown>{msg.content || (msg.isStreaming ? "▋" : "")}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2">Quick Actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                type="button"
                onClick={() => void sendMessage(prompt)}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border-2 border-slate-200 hover:border-teal hover:text-teal transition-colors text-left min-h-[44px]"
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendMessage(input)}
          placeholder="Ask the analyst…"
          disabled={loading}
          className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal min-h-[48px]"
        />
        <button
          type="button"
          onClick={() => void sendMessage(input)}
          disabled={!input.trim() || loading}
          className="bg-teal hover:bg-sky-400 text-white p-3 rounded-xl disabled:opacity-50 min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Send"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
