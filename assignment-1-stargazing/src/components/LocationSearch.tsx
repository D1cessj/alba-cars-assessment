"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodeResult } from "@/lib/types";

type Props = {
  onSelect: (result: GeocodeResult) => void;
  onUseCurrentLocation: () => void;
  isLocating: boolean;
};

export function LocationSearch({ onSelect, onUseCurrentLocation, isLocating }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;

    const controller = new AbortController();
    // Deferred a tick so this effect doesn't set state synchronously on its
    // own invocation (see the debounced fetch below for the actual work).
    queueMicrotask(() => {
      setIsSearching(true);
      setSearchError(null);
    });

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
          )}&count=6&language=en&format=json`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const mapped: GeocodeResult[] = (data.results || []).map(
          (r: {
            id: number;
            name: string;
            country: string;
            admin1?: string;
            latitude: number;
            longitude: number;
          }) => ({
            id: r.id,
            name: r.name,
            country: r.country,
            admin1: r.admin1,
            latitude: r.latitude,
            longitude: r.longitude,
          })
        );
        setResults(mapped);
        setIsOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSearchError("Couldn't search locations right now.");
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm transition focus-within:border-violet-400/50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4 shrink-0 text-slate-400"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (value.trim().length < 2) {
              setResults([]);
              setIsOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search a city…"
          aria-label="Search for a city"
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={isLocating}
          className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-violet-400/60 hover:text-white disabled:opacity-50"
        >
          {isLocating ? "Locating…" : "Use my location"}
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d1f]/95 shadow-2xl shadow-black/50 backdrop-blur-md">
          {isSearching && (
            <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
          )}
          {!isSearching && searchError && (
            <div className="px-4 py-3 text-sm text-rose-400">{searchError}</div>
          )}
          {!isSearching && !searchError && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">
              No cities found. Try another spelling.
            </div>
          )}
          {!isSearching &&
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  onSelect(result);
                  setQuery(result.name);
                  setIsOpen(false);
                }}
                className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition hover:bg-white/5"
              >
                <span className="text-slate-100">{result.name}</span>
                <span className="text-xs text-slate-500">
                  {[result.admin1, result.country].filter(Boolean).join(", ")}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
