import { NextRequest, NextResponse } from "next/server";

const HDX_APP_ID = "c2VudGluZWwtY3Jpc2lzLWFwcDp5YXNoa2VkaWFhQGdtYWlsLmNvbQ==";
const HDX_BASE = "https://hapi.humdata.org/api/v2";

let cache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");
  const locationCode = searchParams.get("location_code");
  const limit = searchParams.get("limit") || "100";

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint parameter" }, { status: 400 });
  }

  const cacheKey = `${endpoint}:${locationCode}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = new URL(`${HDX_BASE}/${endpoint}`);
    url.searchParams.set("app_identifier", HDX_APP_ID);
    if (locationCode) url.searchParams.set("location_code", locationCode);
    url.searchParams.set("limit", limit);
    url.searchParams.set("output_format", "json");

    // Forward any additional params
    for (const [key, value] of searchParams.entries()) {
      if (!["endpoint", "location_code", "limit"].includes(key)) {
        url.searchParams.set(key, value);
      }
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      return NextResponse.json(
        { error: `HDX HAPI returned ${res.status}`, data: [] },
        { status: res.status }
      );
    }

    const data = await res.json();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[HDX-HAPI]", err);
    return NextResponse.json({ error: "Failed to fetch from HDX HAPI", data: [] }, { status: 500 });
  }
}
