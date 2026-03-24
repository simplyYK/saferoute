import { NextResponse } from "next/server";

export async function POST() {
  const key =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 400 });
  }

  try {
    const url = new URL("https://tile.googleapis.com/v1/createSession");
    url.searchParams.set("key", key);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapType: "satellite",
        language: "en-US",
        region: "US",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[google-maps-tiles/session]", res.status, errText);
      return NextResponse.json(
        { error: "Failed to create tile session", detail: errText },
        { status: res.status }
      );
    }

    const data = (await res.json()) as { session?: string };
    if (!data.session) {
      return NextResponse.json({ error: "No session in response" }, { status: 502 });
    }

    return NextResponse.json({ session: data.session });
  } catch (e) {
    console.error("[google-maps-tiles/session]", e);
    return NextResponse.json({ error: "Session request failed" }, { status: 500 });
  }
}
