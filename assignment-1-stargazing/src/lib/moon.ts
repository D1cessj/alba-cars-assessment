import type { MoonData } from "./types";

const SYNODIC_MONTH_DAYS = 29.53058867;
// A known new moon reference point (UTC).
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

/**
 * Approximates lunar phase/illumination from a fixed synodic-month cycle.
 * Good to within ~1-2% illumination, more than precise enough for a
 * "how bright will the sky be tonight" signal — not for real astronomy.
 */
export function getMoonData(date: Date): MoonData {
  const daysSinceNewMoon =
    (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const phase =
    ((daysSinceNewMoon % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) %
    SYNODIC_MONTH_DAYS;
  const phaseFraction = phase / SYNODIC_MONTH_DAYS; // 0 = new, 0.5 = full

  const illumination = (1 - Math.cos(2 * Math.PI * phaseFraction)) / 2;
  const phaseIndex = Math.round(phaseFraction * 8) % 8;

  return {
    illuminationPercent: Math.round(illumination * 100),
    phaseName: PHASE_NAMES[phaseIndex],
  };
}
