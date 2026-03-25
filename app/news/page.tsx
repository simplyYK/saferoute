"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import { ExternalLink, RefreshCw, Radio } from "lucide-react";
import type { RssArticle, FeedSeverity } from "@/app/api/gdelt/route";

const SEVERITY_STYLES: Record<FeedSeverity, { badge: string; border: string }> = {
  critical: { badge: "bg-red-500/15 text-red-400 border-red-500/30", border: "border-l-red-500" },
  warning:  { badge: "bg-orange-500/15 text-orange-400 border-orange-500/30", border: "border-l-orange-400" },
  advisory: { badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", border: "border-l-yellow-400" },
  info:     { badge: "bg-blue-500/15 text-blue-400 border-blue-500/30", border: "border-l-blue-400" },
};

type FilterTab = "all" | "critical" | "warning" | "zones";

const FEED_SOURCE_COUNT = 5; // Reuters, BBC, Al Jazeera, AP News, ReliefWeb — matches /api/gdelt

const ZONE_KEYWORDS = [
  "ukraine", "gaza", "palestine", "israel", "sudan", "myanmar", "burma",
  "yemen", "syria", "somalia", "afghanistan", "congo", "drc", "mali",
  "ethiopia", "haiti", "nagorno", "karabakh", "taiwan",
];

const tabs: { id: FilterTab; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "critical", label: "Critical" },
  { id: "warning",  label: "Warning" },
  { id: "zones",    label: "Conflict Zones" },
];

// TODO P2: Article deduplication across sources (same story from Reuters + BBC)
// TODO P2: Smart region-keyword filtering using user's selected region from store

export default function NewsPage() {
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gdelt");
      const data = await res.json() as { articles?: RssArticle[]; lastUpdated?: string };
      setArticles(data.articles ?? []);
      if (data.lastUpdated) setLastUpdated(data.lastUpdated);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchNews(); }, [fetchNews]);
  useEffect(() => {
    const id = setInterval(() => void fetchNews(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchNews]);

  const minutesAgo = useMemo(() => {
    if (!lastUpdated) return "—";
    const m = Math.max(0, Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60000));
    if (m < 1) return "<1 min ago";
    return `${m} min${m === 1 ? "" : "s"} ago`;
  }, [lastUpdated]);

  const filtered = useMemo(() => {
    if (filter === "critical") return articles.filter((a) => a.severity === "critical");
    if (filter === "warning")  return articles.filter((a) => a.severity === "warning");
    if (filter === "zones") {
      return articles.filter((a) => {
        const blob = `${a.title} ${a.description}`.toLowerCase();
        return ZONE_KEYWORDS.some((k) => blob.includes(k));
      });
    }
    return articles;
  }, [articles, filter]);

  const criticalCount = articles.filter((a) => a.severity === "critical").length;

  const timeAgo = (s: string) => {
    const diff = Date.now() - parsePubDate(s);
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-teal" />
                Live Intelligence Feed
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Updated {minutesAgo}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchNews()}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 mb-3 text-xs text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              {criticalCount} critical alert{criticalCount !== 1 ? "s" : ""} active
            </div>
          )}

          {/* Breaking alert banner for critical articles < 30 min old */}
          {articles.filter((a) => a.severity === "critical" && (Date.now() - parsePubDate(a.pubDate)) < 30 * 60 * 1000).length > 0 && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-3 animate-pulse">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Breaking Alert</p>
              <p className="text-sm text-red-300">
                {articles.find((a) => a.severity === "critical" && (Date.now() - parsePubDate(a.pubDate)) < 30 * 60 * 1000)?.title}
              </p>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`shrink-0 text-xs px-3 py-2 rounded-full border font-medium min-h-[40px] transition-colors ${
                  filter === t.id ? "border-teal bg-teal/10 text-teal" : "border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading && articles.length === 0 && (
            <div className="space-y-3 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white/5 rounded-xl h-24 animate-pulse" />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((a) => {
              const style = SEVERITY_STYLES[a.severity || "info"];
              return (
                <a
                  key={a.id}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block bg-white/4 rounded-xl p-4 border border-white/8 border-l-4 ${style.border} hover:bg-white/6 transition-colors`}
                >
                  <p className="font-semibold text-sm text-white line-clamp-2">{a.title}</p>
                  {a.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${style.badge} capitalize`}>
                      {a.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{a.source}</span>
                    <span className="text-xs text-slate-500">{timeAgo(a.pubDate)}</span>
                    <ExternalLink className="w-3 h-3 text-slate-500 ml-auto shrink-0" />
                  </div>
                </a>
              );
            })}

            {!loading && filter === "critical" && criticalCount === 0 && (
              <p className="text-center text-slate-500 py-10 text-sm">No critical news · Monitoring {FEED_SOURCE_COUNT} sources</p>
            )}
            {!loading && filter === "zones" && filtered.length === 0 && (
              <p className="text-center text-slate-500 py-10 text-sm">No articles matched conflict-zone keywords.</p>
            )}
            {!loading && filter === "warning" && filtered.length === 0 && (
              <p className="text-center text-slate-500 py-10 text-sm">No warning-level articles right now.</p>
            )}
            {!loading && filter === "all" && articles.length === 0 && (
              <div className="text-center py-12">
                <Radio className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No news yet</p>
                <p className="text-slate-500 text-sm mt-1">Monitoring {FEED_SOURCE_COUNT} sources</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function parsePubDate(s: string): number {
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : Date.now();
}
