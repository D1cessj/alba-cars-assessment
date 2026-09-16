"use client";

import { useEffect, useRef, useState } from "react";
import type { StargazingScore } from "@/lib/types";

const SIZE = 220;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreGauge({ score }: { score: StargazingScore }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [dash, setDash] = useState(CIRCUMFERENCE);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const durationMs = 1100;
    const from = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (score.value - from) * eased;

      setDisplayValue(Math.round(current));
      setDash(CIRCUMFERENCE * (1 - current / 100));

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [score.value]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          {/* CSS drop-shadow()'s default filter region clips to the
              element's own bounding box, which produces a visible hard
              rectangle around a partial, thick-stroked arc. Defining the
              filter with an explicit, generous region avoids that. */}
          <defs>
            <filter
              id="score-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="5"
                floodColor={score.color}
                floodOpacity="0.5"
              />
            </filter>
          </defs>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(148,163,184,0.15)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={score.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dash}
            filter="url(#score-glow)"
            style={{ transition: "stroke 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-[family-name:var(--font-display)] text-6xl font-semibold tabular-nums">
            {displayValue}
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
            / 100
          </span>
        </div>
      </div>
      <span
        className="rounded-full px-4 py-1 text-sm font-semibold tracking-wide"
        style={{
          color: score.color,
          backgroundColor: `${score.color}1a`,
          border: `1px solid ${score.color}40`,
        }}
      >
        {score.label} for stargazing
      </span>
    </div>
  );
}
