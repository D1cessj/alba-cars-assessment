import type { MoonData, StargazingScore, WeatherData } from "./types";

/**
 * Fuses cloud cover + precipitation risk (weather API) with moon brightness
 * (computed) into a single 0-100 "how good is tonight for stargazing" score.
 * Weights are a deliberate, documented judgment call — see BUILD_LOG.md.
 */
export function computeStargazingScore(
  weather: WeatherData,
  moon: MoonData
): StargazingScore {
  const cloudPenalty = weather.cloudCoverPercent * 0.55;
  const moonPenalty = moon.illuminationPercent * 0.3;
  const precipPenalty = weather.precipitationProbabilityPercent * 0.15;

  let value = Math.round(100 - cloudPenalty - moonPenalty - precipPenalty);
  value = Math.max(0, Math.min(100, value));

  const reasons: string[] = [];
  if (weather.cloudCoverPercent >= 60) {
    reasons.push(`Heavy cloud cover (${weather.cloudCoverPercent}%)`);
  } else if (weather.cloudCoverPercent >= 25) {
    reasons.push(`Some cloud cover (${weather.cloudCoverPercent}%)`);
  } else {
    reasons.push("Clear skies");
  }

  if (moon.illuminationPercent >= 70) {
    reasons.push(`Bright ${moon.phaseName.toLowerCase()} will wash out faint stars`);
  } else if (moon.illuminationPercent <= 20) {
    reasons.push(`${moon.phaseName} means dark skies`);
  } else {
    reasons.push(`${moon.phaseName} (${moon.illuminationPercent}% lit)`);
  }

  if (weather.precipitationProbabilityPercent >= 40) {
    reasons.push(`${weather.precipitationProbabilityPercent}% chance of rain`);
  }

  if (!weather.isNight) {
    reasons.push("It's currently daylight there — conditions are for tonight");
  }

  let label: StargazingScore["label"];
  let color: string;
  if (value >= 80) {
    label = "Excellent";
    color = "#4ade80";
  } else if (value >= 60) {
    label = "Good";
    color = "#a3e635";
  } else if (value >= 40) {
    label = "Fair";
    color = "#facc15";
  } else if (value >= 20) {
    label = "Poor";
    color = "#fb923c";
  } else {
    label = "Very Poor";
    color = "#f87171";
  }

  return { value, label, color, reasons };
}
