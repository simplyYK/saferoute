import { NextResponse } from "next/server";
import Parser from "rss-parser";

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

const parser = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "SafeRoute/1.0 (crisis navigation app)" },
});

let cache: { data: Article[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

const RSS_SOURCES = [
  { url: "https://feeds.reuters.com/reuters/worldNews", name: "Reuters" },
  { url: "http://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera" },
];

function classifySeverity(title: string): Article["severity"] {
  const t = title.toLowerCase();
  if (/killed|killing|explosion|attack|strike|bombing|shelling|massacre|invasion|airstrike|casualties|dead/.test(t))
    return "critical";
  if (/military|conflict|troops|weapons|missile|ceasefire|offensive|wounded|fighting|war/.test(t))
    return "warning";
  if (/crisis|emergency|displacement|evacuation|sanctions|threat|tension/.test(t))
    return "advisory";
  return "info";
}

async function fetchFeed(source: { url: string; name: string }): Promise<Article[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? []).slice(0, 20).map((item, i) => ({
      id: `${source.name.toLowerCase()}-${i}-${Date.now()}`,
      title: item.title ?? "Untitled",
      description: item.contentSnippet ?? item.summary ?? "",
      url: item.link ?? "",
      imageUrl: null,
      source: source.name,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      severity: classifySeverity(item.title ?? ""),
    }));
  } catch (err) {
    console.error(`[RSS] ${source.name} failed:`, err);
    return [];
  }
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ articles: cache.data, cached: true, lastUpdated: new Date(cache.timestamp).toISOString(), count: cache.data.length });
  }

  const results = await Promise.allSettled(RSS_SOURCES.map(fetchFeed));

  const allArticles: Article[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") allArticles.push(...r.value);
  }

  // Sort by date descending, take top 30
  allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const articles = allArticles.slice(0, 30);

  cache = { data: articles, timestamp: Date.now() };
  return NextResponse.json({ articles, cached: false, lastUpdated: new Date().toISOString(), count: articles.length });
}
