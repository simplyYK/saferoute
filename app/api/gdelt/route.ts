import { NextResponse } from "next/server";
import Parser from "rss-parser";

export const dynamic = "force-dynamic";

export type FeedSeverity = "critical" | "warning" | "advisory" | "info";

export interface RssArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
  severity: FeedSeverity;
}

const FEED_URLS = [
  { source: "Reuters", url: "https://feeds.reuters.com/reuters/worldNews" },
  { source: "BBC", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
];

let cache: { articles: RssArticle[]; lastUpdated: string; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickImage(item: any): string | null {
  const enc = item.enclosure;
  if (enc && typeof enc.url === "string" && String(enc.type || "").startsWith("image")) return enc.url;
  const mc = item["media:content"] || item["media:thumbnail"];
  const u = mc?.$?.url || mc?.url;
  if (typeof u === "string") return u;
  const mth = item["media:content"];
  if (Array.isArray(mth) && mth[0]?.$?.url) return mth[0].$.url;
  return null;
}

function classifySeverity(title: string, description: string): FeedSeverity {
  const t = `${title} ${description}`.toLowerCase();
  if (
    /\bkilled\b|\bexplosion\b|\battack\b|\bstrike\b|\bwar\b|\bbombing\b|\bshelling\b|\bmassacre\b|\binvasion\b/.test(
      t
    )
  ) {
    return "critical";
  }
  if (
    /\bmilitary\b|\bconflict\b|\btroops\b|\bweapons\b|\bmissile\b|\bceasefire\b|\boffensive\b|\bcasualties\b/.test(t)
  ) {
    return "warning";
  }
  if (/\bcrisis\b|\bemergency\b|\bdisplacement\b|\bevacuation\b|\bsanctions\b/.test(t)) {
    return "advisory";
  }
  return "info";
}

function parsePubDate(s: string | undefined): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ articles: cache.articles, lastUpdated: cache.lastUpdated, cached: true });
  }

  const parser = new Parser();
  const settled = await Promise.allSettled(
    FEED_URLS.map(async ({ source, url }) => {
      const feed = await parser.parseURL(url);
      return { source, feed };
    })
  );

  const articles: RssArticle[] = [];
  let idx = 0;

  for (const res of settled) {
    if (res.status !== "fulfilled") {
      console.error("[RSS] feed failed:", res.reason);
      continue;
    }
    const { source, feed } = res.value;
    for (const item of feed.items || []) {
      const title = (item.title || "Untitled").trim();
      const description = (item.contentSnippet || item.summary || item.content || "").trim();
      const link = item.link || item.guid || "";
      if (!link) continue;
      const pubDate = item.pubDate || item.isoDate || new Date().toUTCString();
      const severity = classifySeverity(title, description);
      const imageUrl = pickImage(item);
      articles.push({
        id: `rss-${source}-${idx++}-${encodeURIComponent(link).slice(0, 48)}`,
        title,
        description: description.slice(0, 500),
        link,
        pubDate,
        source,
        imageUrl,
        severity,
      });
    }
  }

  articles.sort((a, b) => parsePubDate(b.pubDate) - parsePubDate(a.pubDate));
  const top = articles.slice(0, 30);
  const lastUpdated = new Date().toISOString();

  cache = { articles: top, lastUpdated, ts: Date.now() };
  return NextResponse.json({ articles: top, lastUpdated, cached: false });
}
