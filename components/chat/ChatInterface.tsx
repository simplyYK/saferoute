"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, Trash2, Heart, Shield, Route, Phone, Droplets, Scale } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAppStore } from "@/store/appStore";
import type { ChatMessage } from "@/types/map";

const QUICK_ACTIONS = [
  { icon: Heart, label: "First Aid", prompt: "How do I treat a bleeding wound with limited supplies?" },
  { icon: Shield, label: "Shelter", prompt: "What should I do during active shelling? How to shelter in place safely?" },
  { icon: Route, label: "Evacuate", prompt: "What are key tips for safe civilian evacuation from a conflict zone?" },
  { icon: Phone, label: "Emergency #s", prompt: "What are emergency contact numbers and organizations for crisis situations?" },
  { icon: Droplets, label: "Water", prompt: "How can I purify water without commercial filters in an emergency?" },
  { icon: Scale, label: "Legal Rights", prompt: "What are my legal rights as a displaced person or refugee under international law?" },
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm SafeRoute AI, your emergency crisis assistant. I can help with **first aid**, **shelter advice**, **evacuation tips**, **legal rights**, and more.\n\nHow can I help you stay safe?",
  timestamp: new Date(),
};

export default function ChatInterface({ className = "" }: { className?: string }) {
  const { language } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        role: m.role,
        content: m.content,
      }));

      try {
        abortRef.current = new AbortController();
        const res = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, language }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
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
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  full += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m))
                  );
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
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `⚠️ Error: ${errMsg}\n\nPlease try again.`, isStreaming: false }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, language]
  );

  const clear = () => setMessages([WELCOME]);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-navy text-white">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-teal" />
          <h2 className="font-semibold">Crisis Assistant</h2>
        </div>
        <button onClick={clear} className="p-1 hover:text-slate-300 transition-colors" aria-label="Clear chat">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-teal text-white"
                  : "bg-slate-100 text-slate-900"
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

      {/* Quick actions (when chat is near empty) */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2">Quick Actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                onClick={() => sendMessage(prompt)}
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
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Type your question..."
          disabled={loading}
          className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal min-h-[48px]"
        />
        <button
          onClick={() => sendMessage(input)}
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
