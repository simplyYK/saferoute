import { NextRequest, NextResponse } from "next/server";

interface GDELTArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

let cache: { data: unknown[]; query: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

function classifySeverity(title: string): "critical" | "warning" | "advisory" {
  const t = title.toLowerCase();
  if (/killed|airstrike|massacre|bombing|explosion|casualties|dead/.test(t)) return "critical";
  if (/fighting|shelling|offensive|attack|military|strike/.test(t)) return "warning";
  return "advisory";
}

function parseDate(raw: string): string {
  try {
    const year = raw.substring(0, 4);
    const month = raw.substring(4, 6);
    const day = raw.substring(6, 8);
    const hour = raw.substring(9, 11) || "00";
    const min = raw.substring(11, 13) || "00";
    return new Date(`${year}-${month}-${day}T${hour}:${min}:00Z`).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "Ukraine conflict";
  const timespan = searchParams.get("timespan") || "24h";
  const limit = parseInt(searchParams.get("limit") || "50");

  if (cache && cache.query === query && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ articles: cache.data, cached: true, count: cache.data.length });
  }

  try {
    const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
    url.searchParams.set("query", query);
    url.searchParams.set("mode", "artlist");
    url.searchParams.set("maxrecords", limit.toString());
    url.searchParams.set("timespan", timespan);
    url.searchParams.set("sort", "datedesc");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`GDELT ${res.status}`);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ articles: [], count: 0 });
    }

    const articles = ((data.articles || []) as GDELTArticle[]).map((a, i) => ({
      id: `gdelt-${i}-${Date.now()}`,
      title: a.title || "Untitled",
      url: a.url || "",
      imageUrl: a.socialimage || null,
      source: a.domain || "Unknown",
      publishedAt: parseDate(a.seendate || ""),
      language: a.language || "English",
      country: a.sourcecountry || "",
      severity: classifySeverity(a.title || ""),
    }));

    cache = { data: articles, query, timestamp: Date.now() };
    return NextResponse.json({ articles, cached: false, count: articles.length });
  } catch (err) {
    console.error("[GDELT]", err);
    if (cache) return NextResponse.json({ articles: cache.data, cached: true, stale: true, count: cache.data.length });
    return NextResponse.json({ articles: [], error: "Failed to fetch news", count: 0 }, { status: 500 });
  }
}
