"use client";

import { useMemo } from "react";

type Star = {
  id: number;
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  minOpacity: number;
  maxOpacity: number;
};

// Rounded to a few decimal places so the server-rendered string and the
// browser's re-serialized inline-style value always match byte-for-byte —
// long floats can otherwise get rounded differently and trip a hydration
// mismatch warning even though the values are "the same".
function round(n: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function makeStars(count: number, seedOffset: number): Star[] {
  return Array.from({ length: count }, (_, i) => {
    // Deterministic pseudo-randomness so server and client render match.
    const seed = (i + 1) * 9973 + seedOffset * 7919;
    const rand = (n: number) => ((Math.sin(seed * n) + 1) / 2);

    return {
      id: seedOffset * 1000 + i,
      top: round(rand(1) * 100),
      left: round(rand(2) * 100),
      size: round(1 + rand(3) * 2),
      duration: round(2 + rand(4) * 4),
      delay: round(rand(5) * 5),
      minOpacity: round(0.15 + rand(6) * 0.2),
      maxOpacity: round(0.6 + rand(7) * 0.4),
    };
  });
}

export function StarsBackground() {
  const farStars = useMemo(() => makeStars(90, 1), []);
  const nearStars = useMemo(() => makeStars(45, 2), []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-[#05060f] via-[#0a0d24] to-[#0e0620]"
    >
      <div className="absolute inset-0 [animation:drift_140s_linear_infinite]">
        {farStars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white [animation-name:twinkle] [animation-timing-function:ease-in-out] [animation-iteration-count:infinite]"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: star.size,
              height: star.size,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
              // @ts-expect-error custom properties consumed by the twinkle keyframes
              "--star-min": star.minOpacity,
              "--star-max": star.maxOpacity,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 [animation:drift_90s_linear_infinite_reverse]">
        {nearStars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-sky-100 shadow-[0_0_6px_rgba(224,242,254,0.8)] [animation-name:twinkle] [animation-timing-function:ease-in-out] [animation-iteration-count:infinite]"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: star.size + 1,
              height: star.size + 1,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
              // @ts-expect-error custom properties consumed by the twinkle keyframes
              "--star-min": star.minOpacity,
              "--star-max": star.maxOpacity,
            }}
          />
        ))}
      </div>
      <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
    </div>
  );
}
