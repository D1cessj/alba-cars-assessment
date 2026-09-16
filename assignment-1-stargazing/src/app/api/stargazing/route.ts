import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getMoonData } from "@/lib/moon";
import { computeStargazingScore } from "@/lib/scoring";
import type { ApodData, StargazingResponse, WeatherData } from "@/lib/types";

export const runtime = "nodejs";

async function fetchApod(): Promise<{ apod: ApodData | null; error: string | null }> {
  const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
  const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;

  try {
    // APOD only changes once a day — cache aggressively so we don't burn
    // through NASA's DEMO_KEY rate limit (30/hr, 50/day).
    const res = await fetchWithRetry(url, { next: { revalidate: 21_600 } });

    if (!res.ok) {
      return { apod: null, error: `NASA APOD returned HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      apod: {
        title: data.title,
        explanation: data.explanation,
        url: data.url,
        hdurl: data.hdurl,
        mediaType: data.media_type === "image" || data.media_type === "video"
          ? data.media_type
          : "other",
        copyright: data.copyright,
        date: data.date,
      },
      error: null,
    };
  } catch {
    return { apod: null, error: "Could not reach NASA's APOD service right now." };
  }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=cloud_cover,precipitation_probability,temperature_2m,is_day` +
    `&daily=sunrise,sunset&timezone=auto&forecast_days=1`;

  // Weather shifts fast — cache briefly rather than not at all.
  const res = await fetchWithRetry(url, { next: { revalidate: 600 } });

  if (!res.ok) {
    throw new Error(`Open-Meteo returned HTTP ${res.status}`);
  }

  const data = await res.json();

  return {
    cloudCoverPercent: data.current.cloud_cover,
    precipitationProbabilityPercent: data.current.precipitation_probability,
    temperatureC: data.current.temperature_2m,
    sunset: data.daily.sunset[0],
    sunrise: data.daily.sunrise[0],
    isNight: data.current.is_day === 0,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const name = searchParams.get("name") || "Selected location";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat and lon query params are required and must be numbers." },
      { status: 400 }
    );
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "lat/lon out of range." },
      { status: 400 }
    );
  }

  try {
    const [weather, { apod, error: apodError }] = await Promise.all([
      fetchWeather(lat, lon),
      fetchApod(),
    ]);

    const moon = getMoonData(new Date());
    const score = computeStargazingScore(weather, moon);

    const payload: StargazingResponse = {
      location: { name, latitude: lat, longitude: lon },
      weather,
      moon,
      apod,
      apodError,
      score,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't fetch tonight's weather for that location. The forecast service may be down — try again shortly.",
      },
      { status: 502 }
    );
  }
}
