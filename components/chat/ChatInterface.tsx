"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send, Loader2, Bot, Trash2, AlertTriangle, Plane, Activity,
  MapPin, Car, Phone, Route, Wifi, WifiOff, Wind, Search, Eye,
  FileWarning, Layers, Navigation, ChevronUp, ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import type { ChatMessage } from "@/types/map";

interface AgentAction {
  action: string;
  [key: string]: unknown;
}

const QUICK_ACTIONS = [
  { icon: AlertTriangle, label: "Active threats", prompt: "What are the active threats near my current location right now? Give me a threat assessment." },
  { icon: Plane,         label: "Aircraft overhead", prompt: "What aircraft are currently in the region? Any military activity I should know about?" },
  { icon: Activity,      label: "Seismic spikes", prompt: "Are there any recent seismic spikes near me? Could any be related to artillery or explosions?" },
  { icon: MapPin,        label: "Nearest hospital", prompt: "Where is the nearest hospital or medical facility to my current location? Show it on the map." },
  { icon: Car,           label: "Evacuation route", prompt: "What is the safest evacuation route from my current location? Calculate a route for me." },
  { icon: Phone,         label: "Emergency contacts", prompt: "What are the emergency contacts, hotlines, and humanitarian organizations for my region?" },
  { icon: Wind,          label: "Air quality", prompt: "What is the current air quality at my location? Is it safe to be outside?" },
  { icon: Search,        label: "Find shelter", prompt: "Find the nearest shelters or safe buildings near my location and show them on the map." },
  { icon: Eye,           label: "SITREP", prompt: "Give me a full situation report: conflict events, flights, seismic activity, air quality, and news for my area." },
  { icon: FileWarning,   label: "Report hazard", prompt: "I want to report a hazard at my current location." },
  { icon: Layers,        label: "Show all layers", prompt: "Enable all map layers so I can see everything: conflict events, reports, resources, and danger zones." },
  { icon: Navigation,    label: "Night vision mode", prompt: "Switch the map to night vision mode." },
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "I'm your **Sentinel AI** — crisis intelligence at your command.\n\nI can **find shelters & hospitals**, **calculate safe routes**, **check live threats**, **track aircraft**, **get air quality**, and **control the map** — all through conversation.\n\nAsk me anything or use quick actions below.",
  timestamp: new Date(),
};

function QuickActionsPanel({ expanded: defaultExpanded, onAction }: { expanded: boolean; onAction: (prompt: string) => void }) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <div className="px-4 pb-2 shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-1.5 uppercase tracking-wide hover:text-teal transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        Quick Actions
      </button>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => onAction(prompt)}
              className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border border-white/10 hover:border-teal/40 hover:bg-teal/5 hover:text-teal transition-all text-left text-slate-400"
            >
              <Icon className="w-3.5 h-3.5 shrink-0 text-teal" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function executeAction(action: AgentAction, router: ReturnType<typeof useRouter>) {
  const mapStore = useMapStore.getState();
  const appStore = useAppStore.getState();

  switch (action.action) {
    case "flyTo": {
      const lat = action.lat as number;
      const lng = action.lng as number;
      mapStore.flyTo([lat, lng]);
      // Navigate to map if not already there
      if (!window.location.pathname.startsWith("/map") && !window.location.pathname.startsWith("/globe")) {
        router.push("/map");
      }
      break;
    }
    case "toggleLayer": {
      const layer = action.layer as "conflictEvents" | "reports" | "resources" | "dangerZones";
      const enabled = action.enabled as boolean | undefined;
      const current = mapStore.activeLayers[layer];
      if (enabled !== undefined && current !== enabled) {
        mapStore.toggleLayer(layer);
      } else if (enabled === undefined) {
        mapStore.toggleLayer(layer);
      }
      break;
    }
    case "planRoute": {
      const origin = action.origin as { lat: number; lng: number; name: string };
      const dest = action.destination as { lat: number; lng: number; name: string };
      // Store route request in sessionStorage for RoutePlanner to pick up
      sessionStorage.setItem("agentRoute", JSON.stringify({ origin, destination: dest, profile: action.profile ?? "foot" }));
      router.push("/route");
      break;
    }
    case "submitReport": {
      sessionStorage.setItem("agentReport", JSON.stringify(action));
      router.push("/report");
      break;
    }
    case "setVisualMode": {
      const mode = action.mode as string;
      appStore.setVisualMode(mode as "standard" | "flir" | "night" | "crt" | "blackout");
      break;
    }
    case "showResources": {
      const resources = (action.resources ?? []) as Array<{
        id: string; type: string; name: string;
        latitude: number; longitude: number;
        phone?: string; website?: string; address?: string;
        operating_hours?: string; rating?: number; source?: string;
      }>;
      if (resources.length > 0) {
        const type = (action.resourceType as string) ?? resources[0]?.type ?? "resource";
        mapStore.addResources(resources.map((r) => ({ ...r, type: r.type || type })));
        // Ensure the resources layer is enabled
        if (!mapStore.activeLayers.resources) {
          mapStore.toggleLayer("resources");
        }
        // Fly to the first resource
        mapStore.flyTo([resources[0].latitude, resources[0].longitude]);
        if (!window.location.pathname.startsWith("/map")) {
          router.push("/map");
        }
      }
      break;
    }
  }
}

export default function ChatInterface({ className = "", initialPrompt }: { className?: string; initialPrompt?: string }) {
  const router = useRouter();
  const { language, userLocation } = useAppStore();
  const { viewCountry, center, bounds } = useMapStore();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [seismicCount, setSeismicCount] = useState(0);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialPromptSent = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, actionLog]);

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

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Auto-send initialPrompt once on mount
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current) {
      initialPromptSent.current = true;
      const t = setTimeout(() => { void sendMessage(initialPrompt); }, 400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildContext = useCallback(() => {
    const ctx: Record<string, unknown> = {
      country: viewCountry,
      mapCenter: { lat: center[0], lng: center[1] },
      mapBounds: bounds,
      recentSeismic: seismicCount,
    };
    if (userLocation) {
      ctx.userGPS = { lat: userLocation.lat, lng: userLocation.lng };
      ctx.locationNote = `User's exact GPS coordinates: ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}. Use these coordinates for nearby resource/route/threat queries.`;
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
      setActionLog([]);

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
                const parsed = JSON.parse(data) as { content?: string; actions?: AgentAction[] };

                // Handle agent actions
                if (parsed.actions) {
                  for (const action of parsed.actions) {
                    try {
                      executeAction(action, router);
                      const label = actionLabel(action);
                      if (label) setActionLog((prev) => [...prev, label]);
                    } catch (err) {
                      console.warn("[Agent action failed]", err);
                    }
                  }
                }

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
    [loading, messages, language, buildContext, router]
  );

  const clear = () => { abortRef.current?.abort(); setMessages([WELCOME]); setLoading(false); setActionLog([]); };

  const hasLocation = !!userLocation;

  return (
    <div className={`flex flex-col h-full bg-[#0a0f1e] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 text-white gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-5 h-5 text-teal shrink-0" />
          <h2 className="font-semibold text-sm truncate">Intelligence Agent</h2>
          <span className="hidden sm:inline-flex items-center rounded-full border border-teal/40 bg-teal/10 text-teal text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shrink-0">
            Agentic
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
      <div className="px-4 py-2 bg-white/3 border-b border-white/6 flex items-center gap-3 text-[11px] text-slate-500 shrink-0 flex-wrap">
        <span className="flex items-center gap-1">
          {hasLocation ? (
            <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-600 font-medium">GPS Active</span></>
          ) : (
            <><WifiOff className="w-3 h-3 text-amber-500" /><span className="text-amber-600">No GPS</span></>
          )}
        </span>
        {viewCountry && <><span className="text-slate-400">·</span><span>{viewCountry}</span></>}
        {seismicCount > 0 && <><span className="text-slate-400">·</span><span>{seismicCount} seismic</span></>}
        <span className="text-slate-400">·</span>
        <span className="text-teal font-medium">18 tools available</span>
      </div>

      {/* Action log — shows what the agent did */}
      {actionLog.length > 0 && (
        <div className="px-4 py-1.5 bg-teal/5 border-b border-teal/20 flex items-center gap-2 text-[10px] text-teal shrink-0 overflow-x-auto">
          <span className="font-bold uppercase tracking-wider shrink-0">Actions:</span>
          {actionLog.map((a, i) => (
            <span key={i} className="bg-teal/10 border border-teal/20 rounded-full px-2 py-0.5 shrink-0">{a}</span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-teal/15 flex items-center justify-center shrink-0 mr-2 mt-1">
                <Bot className="w-3.5 h-3.5 text-teal" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-teal text-white rounded-br-sm"
                  : "bg-white/6 text-slate-200 rounded-bl-sm border border-white/6"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-teal">
                  <ReactMarkdown>{msg.content || (msg.isStreaming ? "Thinking & using tools..." : "")}</ReactMarkdown>
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
            <div className="bg-white/6 border border-white/6 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal" />
              <span className="text-xs text-slate-400">Analyzing with live data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions — collapsible, always accessible */}
      {!loading && (
        <QuickActionsPanel
          expanded={messages.length <= 2}
          onAction={(prompt) => void sendMessage(prompt)}
        />
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/8 bg-[#0a0f1e] shrink-0 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendMessage(input)}
          placeholder={hasLocation ? "Ask anything — search, route, report..." : "Ask anything… (enable GPS for best results)"}
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-teal/50 disabled:opacity-50 min-h-[48px] transition-colors"
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

function actionLabel(action: AgentAction): string | null {
  switch (action.action) {
    case "flyTo": return `Map → ${(action.name as string) || `${(action.lat as number).toFixed(2)}, ${(action.lng as number).toFixed(2)}`}`;
    case "toggleLayer": return `Layer: ${action.layer}`;
    case "planRoute": return "Route planned";
    case "submitReport": return "Report submitted";
    case "setVisualMode": return `Mode: ${action.mode}`;
    default: return null;
  }
}
