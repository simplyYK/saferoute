"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import { ExternalLink, RefreshCw, Radio } from "lucide-react";

interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
  severity: "critical" | "warning" | "advisory" | "info";
}

const SEVERITY_STYLES: Record<string, { badge: string; border: string; dot: string }> = {
  critical: { badge: "bg-red-100 text-red-700 border-red-200", border: "border-l-red-500", dot: "bg-red-500" },
  warning: { badge: "bg-orange-100 text-orange-700 border-orange-200", border: "border-l-orange-400", dot: "bg-orange-400" },
  advisory: { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", border: "border-l-yellow-400", dot: "bg-yellow-400" },
  info: { badge: "bg-blue-100 text-blue-700 border-blue-200", border: "border-l-blue-400", dot: "bg-blue-400" },
};

type FilterTab = "all" | "critical" | "warning" | "conflict";

const CONFLICT_KEYWORDS = /ukraine|gaza|sudan|myanmar|syria|yemen|war|conflict|troops|shelling|airstrike/i;

const AUTO_REFRESH_MS = 5 * 60 * 1000;

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gdelt");
      const data = await res.json() as { articles?: Article[]; lastUpdated?: string };
      setArticles(data.articles ?? []);
      if (data.lastUpdated) setLastUpdated(data.lastUpdated);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNews();
    const interval = setInterval(() => { void fetchNews(); }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const lastUpdatedStr = lastUpdated
    ? `Updated ${timeAgo(lastUpdated)}`
    : "Monitoring 3 sources";

  const filtered = articles.filter((a) => {
    if (filter === "critical") return a.severity === "critical";
    if (filter === "warning") return a.severity === "warning" || a.severity === "critical";
    if (filter === "conflict") return CONFLICT_KEYWORDS.test(a.title) || CONFLICT_KEYWORDS.test(a.description);
    return true;
  });

  const criticalCount = articles.filter((a) => a.severity === "critical").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-teal" />
                Live Intelligence Feed
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{lastUpdatedStr}</p>
            </div>
            <button
              onClick={fetchNews}
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Critical count badge */}
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 mb-3 text-xs text-red-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              {criticalCount} critical alert{criticalCount !== 1 ? "s" : ""} active
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(["all", "critical", "warning", "conflict"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border-2 font-medium min-h-[36px] capitalize transition-colors ${
                  filter === tab
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {tab === "conflict" ? "Conflict Zones" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Loading skeletons */}
          {loading && articles.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-slate-100" />
              ))}
            </div>
          )}

          {/* Articles */}
          <div className="space-y-3">
            {filtered.map((a) => {
              const style = SEVERITY_STYLES[a.severity ?? "info"];
              return (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block bg-white rounded-xl p-4 shadow-sm border border-slate-100 border-l-4 ${style.border} hover:shadow-md transition-shadow`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 line-clamp-2">{a.title}</p>
                    {a.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${style.badge} capitalize`}>
                        {a.severity}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{a.source}</span>
                      <span className="text-xs text-slate-400">{timeAgo(a.publishedAt)}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                    </div>
                  </div>
                </a>
              );
            })}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-12">
                <Radio className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No {filter !== "all" ? filter : ""} news</p>
                <p className="text-slate-400 text-sm mt-1">Monitoring 3 sources</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
