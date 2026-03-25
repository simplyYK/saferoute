import { NextRequest, NextResponse } from "next/server";

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm + hail",
  99: "Thunderstorm + heavy hail",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,rain,weathercode,visibility`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();

    const current = data.current;
    return NextResponse.json({
      temperature: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
      rain: current.rain,
      weatherCode: current.weathercode,
      visibility: current.visibility,
      condition: WEATHER_CODES[current.weathercode] ?? "Unknown",
      units: {
        temperature: data.current_units?.temperature_2m ?? "°C",
        windSpeed: data.current_units?.wind_speed_10m ?? "km/h",
        rain: data.current_units?.rain ?? "mm",
        visibility: data.current_units?.visibility ?? "m",
      },
    });
  } catch (err) {
    console.error("[Weather]", err);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
