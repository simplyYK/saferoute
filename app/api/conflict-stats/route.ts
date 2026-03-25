import { NextRequest, NextResponse } from "next/server";
import { nameToIso3 } from "@/lib/constants/country-codes";

export const dynamic = "force-dynamic";

const HDX_APP_ID = "c2VudGluZWwtY3Jpc2lzLWFwcDp5YXNoa2VkaWFhQGdtYWlsLmNvbQ==";
const HDX_BASE = "https://hapi.humdata.org/api/v2";

interface ConflictRecord {
  admin1_name: string;
  admin2_name: string;
  event_type: string;
  events: number | null;
  fatalities: number | null;
  reference_period_start: string;
  reference_period_end: string;
}

// Cache per country: 10 min TTL
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || "Ukraine";
  const iso3 = searchParams.get("iso3") || nameToIso3(country) || "";

  if (!iso3) {
    return NextResponse.json({ error: "Unknown country", country });
  }

  // Cache check
  const cached = cache.get(iso3);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Fetch admin2-level conflict events from HDX HAPI (ACLED-sourced data)
    const url = `${HDX_BASE}/coordination-context/conflict-events?location_code=${iso3}&admin_level=2&limit=10000&app_identifier=${HDX_APP_ID}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HDX HAPI ${res.status}`);
    const json = await res.json();
    const records: ConflictRecord[] = json.data || [];

    // Group by month and aggregate
    const byMonth: Record<string, { events: number; fatalities: number }> = {};
    const byRegion: Record<string, { events: number; fatalities: number; types: Set<string> }> = {};

    for (const r of records) {
      const events = r.events || 0;
      const fatalities = r.fatalities || 0;
      if (events === 0 && fatalities === 0) continue;

      const month = r.reference_period_start?.slice(0, 7) || "unknown";
      if (!byMonth[month]) byMonth[month] = { events: 0, fatalities: 0 };
      byMonth[month].events += events;
      byMonth[month].fatalities += fatalities;

      const region = r.admin1_name || "Unknown";
      if (!byRegion[region]) byRegion[region] = { events: 0, fatalities: 0, types: new Set() };
      byRegion[region].events += events;
      byRegion[region].fatalities += fatalities;
      if (r.event_type) byRegion[region].types.add(r.event_type);
    }

    // Get sorted months (most recent first)
    const sortedMonths = Object.entries(byMonth)
      .sort((a, b) => b[0].localeCompare(a[0]));

    // Latest complete month (skip current partial month)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const latestComplete = sortedMonths.find(([m]) => m < currentMonth);
    const latestMonth = sortedMonths[0];

    // Top conflict regions (all-time total)
    const topRegions = Object.entries(byRegion)
      .map(([name, data]) => ({
        name,
        events: data.events,
        fatalities: data.fatalities,
        types: Array.from(data.types),
      }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);

    // Trend: compare latest complete month to previous
    let trend: { direction: string; percentChange: number } | null = null;
    if (latestComplete && sortedMonths.length >= 2) {
      const prev = sortedMonths.find(([m]) => m < latestComplete[0]);
      if (prev && prev[1].events > 0) {
        const pctChange = ((latestComplete[1].events - prev[1].events) / prev[1].events) * 100;
        trend = {
          direction: pctChange > 5 ? "increasing" : pctChange < -5 ? "decreasing" : "stable",
          percentChange: Math.round(pctChange),
        };
      }
    }

    // Total events in last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const cutoff = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, "0")}`;
    const last12 = sortedMonths.filter(([m]) => m >= cutoff);
    const totalEvents12m = last12.reduce((s, [, d]) => s + d.events, 0);
    const totalFatalities12m = last12.reduce((s, [, d]) => s + d.fatalities, 0);

    const result = {
      country,
      iso3,
      source: "ACLED via HDX HAPI",
      lastUpdated: new Date().toISOString(),
      summary: {
        totalEvents12m,
        totalFatalities12m,
        latestMonth: latestMonth ? { month: latestMonth[0], ...latestMonth[1] } : null,
        latestCompleteMonth: latestComplete ? { month: latestComplete[0], ...latestComplete[1] } : null,
        trend,
        monthlyData: sortedMonths.slice(0, 12).map(([month, data]) => ({ month, ...data })),
      },
      topRegions,
      recordCount: records.length,
    };

    cache.set(iso3, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[conflict-stats]", err);
    return NextResponse.json({ error: "Failed to fetch conflict stats", country }, { status: 500 });
  }
}
