import type { MoonData, WeatherData } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-slate-100">{value}</span>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export function WeatherPanel({
  weather,
  moon,
}: {
  weather: WeatherData;
  moon: MoonData;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-200">
        Tonight&apos;s Conditions
      </h3>
      <div className="mt-2">
        <StatRow label="Cloud cover" value={`${weather.cloudCoverPercent}%`} />
        <StatRow
          label="Chance of rain"
          value={`${weather.precipitationProbabilityPercent}%`}
        />
        <StatRow label="Temperature" value={`${Math.round(weather.temperatureC)}°C`} />
        <StatRow
          label="Moon"
          value={`${moon.illuminationPercent}% lit`}
          sub={moon.phaseName}
        />
        <StatRow label="Sunset" value={formatTime(weather.sunset)} />
        <StatRow label="Sunrise" value={formatTime(weather.sunrise)} />
      </div>
    </div>
  );
}
