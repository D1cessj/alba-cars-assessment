"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocationSearch } from "./LocationSearch";
import { ScoreGauge } from "./ScoreGauge";
import { WeatherPanel } from "./WeatherPanel";
import { ApodCard } from "./ApodCard";
import { ResultsSkeleton } from "./Skeletons";
import type { GeocodeResult, StargazingResponse } from "@/lib/types";

const QUICK_PICKS: GeocodeResult[] = [
  { id: 1, name: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708 },
  { id: 2, name: "Cairo", country: "Egypt", latitude: 30.0444, longitude: 31.2357 },
  { id: 3, name: "Reykjavik", country: "Iceland", latitude: 64.1466, longitude: -21.9426 },
  { id: 4, name: "Atacama", country: "Chile", latitude: -23.8859, longitude: -69.0128 },
];

type Status = "idle" | "loading" | "error" | "success";

export function StargazingApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<StargazingResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const load = useCallback(
    async (location: GeocodeResult, syncUrl = true) => {
      setStatus("loading");
      setErrorMessage(null);

      if (syncUrl) {
        const params = new URLSearchParams({
          lat: String(location.latitude),
          lon: String(location.longitude),
          name: location.name,
        });
        router.replace(`?${params.toString()}`, { scroll: false });
      }

      try {
        const res = await fetch(
          `/api/stargazing?lat=${location.latitude}&lon=${location.longitude}&name=${encodeURIComponent(
            location.name
          )}`
        );
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Something went wrong.");
        }

        setData(json);
        setStatus("success");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong."
        );
        setStatus("error");
      }
    },
    [router]
  );

  // Restore location from a shared link on first load. This is the
  // "fetch data in an effect on mount" pattern React's own docs call out as
  // a legitimate use case (https://react.dev/learn/you-might-not-need-an-effect).
  // The stricter set-state-in-effect lint rule wants this deferred, but
  // doing so serves no purpose here (there's nothing to derive — this is a
  // genuine one-time side effect), so it's suppressed rather than
  // worked around.
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const name = searchParams.get("name");
    if (lat && lon) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load(
        {
          id: 0,
          name: name || "Shared location",
          country: "",
          latitude: Number(lat),
          longitude: Number(lon),
        },
        false
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setErrorMessage("Your browser doesn't support geolocation.");
      setStatus("error");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        load({
          id: -1,
          name: "Your location",
          country: "",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setIsLocating(false);
        setErrorMessage(
          "Couldn't get your location — search for a city instead."
        );
        setStatus("error");
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-10 px-4 py-16 sm:px-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs font-medium uppercase tracking-[0.35em] text-violet-300/70">
          Nightscope
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-4xl">
          Is tonight good for stargazing?
        </h1>
        <p className="max-w-md text-sm text-slate-400">
          Live cloud cover, moon brightness, and NASA&apos;s picture of the
          day — fused into one score for any city on Earth.
        </p>
      </header>

      <LocationSearch
        onSelect={(r) => load(r)}
        onUseCurrentLocation={handleUseCurrentLocation}
        isLocating={isLocating}
      />

      {status === "idle" && (
        <div className="flex flex-col items-center gap-4 pt-4">
          <p className="text-xs text-slate-500">Or try one of these:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick.id}
                onClick={() => load(pick)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300 transition hover:border-violet-400/50 hover:text-white"
              >
                {pick.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === "loading" && <ResultsSkeleton />}

      {status === "error" && (
        <div
          role="alert"
          className="animate-fade-in-up max-w-md rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-center"
        >
          <p className="font-medium text-rose-300">Couldn&apos;t load that</p>
          <p className="mt-1 text-sm text-rose-200/80">{errorMessage}</p>
        </div>
      )}

      {status === "success" && data && (
        <div className="animate-fade-in-up grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-sm">
            <p className="text-sm text-slate-400">{data.location.name}</p>
            <ScoreGauge score={data.score} />
            <ul className="mt-2 space-y-1 text-center text-xs text-slate-500">
              {data.score.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <WeatherPanel weather={data.weather} moon={data.moon} />

          <div className="md:col-span-2">
            <ApodCard apod={data.apod} apodError={data.apodError} />
          </div>
        </div>
      )}
    </div>
  );
}
