"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import type { NewsArticle } from "@/types/map";
import { ExternalLink, RefreshCw } from "lucide-react";

type FilterTab = "all" | "critical" | "warning" | "zones";

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  critical: { badge: "bg-red-100 text-red-700 border-red-200", border: "border-l-red-500" },
  warning: { badge: "bg-orange-100 text-orange-700 border-orange-200", border: "border-l-orange-500" },
  advisory: { badge: "bg-amber-100 text-amber-800 border-amber-200", border: "border-l-amber-500" },
  info: { badge: "bg-blue-100 text-blue-700 border-blue-200", border: "border-l-blue-400" },
};

const ZONE_KEYWORDS = [
  "ukraine",
  "gaza",
  "palestine",
  "israel",
  "sudan",
  "myanmar",
  "burma",
  "yemen",
  "syria",
  "somalia",
  "afghanistan",
  "congo",
  "drc",
  "mali",
  "ethiopia",
  "haiti",
  "nagorno",
  "karabakh",
  "taiwan",
];

function normalizeArticle(raw: Record<string, unknown>): NewsArticle | null {
  const link = typeof raw.link === "string" ? raw.link : typeof raw.url === "string" ? raw.url : "";
  if (!link) return null;
  const pubDate =
    typeof raw.pubDate === "string"
      ? raw.pubDate
      : typeof raw.publishedAt === "string"
        ? raw.publishedAt
        : new Date().toISOString();
  const sev = raw.severity;
  const severity =
    sev === "critical" || sev === "warning" || sev === "advisory" || sev === "info" ? sev : "info";
  return {
    id: String(raw.id || link),
    title: String(raw.title || "Untitled"),
    url: link,
    description: typeof raw.description === "string" ? raw.description : undefined,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : null,
    source: String(raw.source || "News"),
    publishedAt: new Date(pubDate).toISOString(),
    severity,
  };
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gdelt");
      const data = await res.json();
      const rawList = Array.isArray(data.articles) ? data.articles : [];
      const normalized = rawList
        .map((x: Record<string, unknown>) => normalizeArticle(x))
        .filter((a: NewsArticle | null): a is NewsArticle => a !== null);
      setArticles(normalized);
      setLastUpdated(typeof data.lastUpdated === "string" ? data.lastUpdated : new Date().toISOString());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNews();
  }, [fetchNews]);

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
    const inZone = (a: NewsArticle) => {
      const blob = `${a.title} ${a.description || ""}`.toLowerCase();
      return ZONE_KEYWORDS.some((k) => blob.includes(k));
    };
    if (filter === "all") return articles;
    if (filter === "critical") return articles.filter((a) => a.severity === "critical");
    if (filter === "warning") return articles.filter((a) => a.severity === "warning");
    return articles.filter(inZone);
  }, [articles, filter]);

  const showZonesEmpty = filter === "zones" && !loading && filtered.length === 0;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "critical", label: "Critical" },
    { id: "warning", label: "Warning" },
    { id: "zones", label: "Conflict Zones" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Live Intelligence Feed</h1>
              <p className="text-sm text-slate-500">Updated {minutesAgo}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchNews()}
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`shrink-0 text-xs px-3 py-2 rounded-full border-2 font-medium min-h-[40px] transition-colors ${
                  filter === t.id ? "border-teal bg-teal/10 text-teal" : "border-slate-200 text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((a) => {
              const style = SEVERITY_STYLES[a.severity || "info"];
              return (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block bg-white rounded-xl p-4 shadow-sm border border-slate-100 border-l-4 ${style.border} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    {a.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.imageUrl}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg shrink-0"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 line-clamp-2">{a.title}</p>
                      {a.description && (
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{a.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${style.badge}`}>
                          {a.severity}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{a.source}</span>
                        <span className="text-xs text-slate-400">{timeAgo(a.publishedAt)}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
            {!loading && filter === "critical" && articles.filter((x) => x.severity === "critical").length === 0 && (
              <p className="text-center text-slate-500 py-10 text-sm">No critical news · Monitoring 3 sources</p>
            )}
            {!loading && showZonesEmpty && (
              <p className="text-center text-slate-500 py-10 text-sm">No articles matched conflict-zone keywords.</p>
            )}
            {!loading && filter === "all" && articles.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">No articles yet. Pull to refresh.</p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
