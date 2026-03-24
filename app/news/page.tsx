"use client";
import { useState, useEffect } from "react";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import type { NewsArticle } from "@/types/map";
import { ExternalLink, RefreshCw } from "lucide-react";

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  critical: { badge: "bg-red-100 text-red-700 border-red-200", border: "border-l-red-500" },
  warning: { badge: "bg-orange-100 text-orange-700 border-orange-200", border: "border-l-orange-500" },
  advisory: { badge: "bg-blue-100 text-blue-700 border-blue-200", border: "border-l-blue-400" },
};

const REGIONS = ["Ukraine", "Sudan", "Gaza", "Myanmar", "Yemen", "Syria"];

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState("Ukraine");

  const fetchNews = async (r: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gdelt?query=${encodeURIComponent(`${r} conflict`)}&limit=50`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(region); }, [region]);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Crisis News</h1>
              <p className="text-sm text-slate-500">Real-time conflict updates</p>
            </div>
            <button
              onClick={() => fetchNews(region)}
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Region selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border-2 font-medium min-h-[36px] transition-colors ${
                  region === r ? "border-teal bg-teal/10 text-teal" : "border-slate-200 text-slate-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mb-4 text-xs">
            {Object.entries(SEVERITY_STYLES).map(([key, s]) => (
              <span key={key} className={`px-2 py-0.5 rounded-full border ${s.badge}`}>
                {key}
              </span>
            ))}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {articles.map((a) => {
              const style = SEVERITY_STYLES[a.severity || "advisory"];
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
                      <p className="font-semibold text-sm text-slate-900 line-clamp-2">{a.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${style.badge}`}>
                          {a.severity}
                        </span>
                        <span className="text-xs text-slate-500">{a.source}</span>
                        <span className="text-xs text-slate-400">{timeAgo(a.publishedAt)}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
            {!loading && articles.length === 0 && (
              <p className="text-center text-slate-400 py-8">No news articles found.</p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
