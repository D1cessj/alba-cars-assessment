"use client";

import { useState } from "react";
import type { ApodData } from "@/lib/types";

export function ApodCard({
  apod,
  apodError,
}: {
  apod: ApodData | null;
  apodError: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!apod) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-200">
          NASA Picture of the Day
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          {apodError ??
            "NASA's picture of the day couldn't be loaded right now."}
        </p>
      </div>
    );
  }

  const explanation =
    !expanded && apod.explanation.length > 220
      ? apod.explanation.slice(0, 220).trimEnd() + "…"
      : apod.explanation;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
      <div className="relative aspect-video w-full bg-black/40">
        {apod.mediaType === "image" ? (
          // Third-party, unpredictable-domain image — a plain <img> avoids
          // configuring next/image remotePatterns for every possible NASA host.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={apod.url}
            alt={apod.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : apod.mediaType === "video" ? (
          <iframe
            src={apod.url}
            title={apod.title}
            className="h-full w-full"
            allow="encrypted-media"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Today&apos;s picture isn&apos;t viewable inline.
          </div>
        )}
      </div>
      <div className="p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300/80">
          NASA Picture of the Day &middot; {apod.date}
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-slate-100">
          {apod.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {explanation}
          {apod.explanation.length > 220 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 font-medium text-violet-300 hover:text-violet-200"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </p>
        {apod.copyright && (
          <p className="mt-3 text-xs text-slate-600">© {apod.copyright}</p>
        )}
      </div>
    </div>
  );
}
