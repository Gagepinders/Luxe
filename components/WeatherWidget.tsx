import Link from "next/link";
import { format } from "date-fns";
import { CloudSnow, ArrowRight } from "lucide-react";
import { getMonitoredAreas } from "@/lib/monitoredAreas";
import { getForecastsForAreas, describeWeatherCode } from "@/lib/weather";

export default async function WeatherWidget() {
  const areas = await getMonitoredAreas();
  const withForecasts = await getForecastsForAreas(areas);
  const hq = withForecasts[0];
  if (!hq?.forecast) return null;

  const alertAreas = withForecasts.filter((a) => a.forecast?.isSnowDay);
  const forecast = hq.forecast;

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2.5 font-semibold text-forest-950">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ice-100 text-ice-600">
            <CloudSnow size={14} />
          </span>
          {hq.label} — 7-Day Forecast
        </h2>
        <Link
          href="/weather"
          className="text-xs text-forest-700 hover:underline flex items-center gap-1"
        >
          All {withForecasts.length} areas <ArrowRight size={12} />
        </Link>
      </div>

      {alertAreas.length > 0 && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-ice-100 px-3 py-2 text-xs text-ice-600">
          <CloudSnow size={13} />
          Snow expected in {alertAreas.length} of {withForecasts.length} monitored area
          {withForecasts.length > 1 ? "s" : ""} — plan plowing
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5">
        {forecast.daily.map((day, i) => {
          const { label, icon } = describeWeatherCode(day.weatherCode);
          const isSnow = day.snowfallIn > 0;
          const isToday = i === 0;
          return (
            <div
              key={day.date}
              className={`rounded-lg p-2 text-center transition-transform hover:-translate-y-0.5 ${
                isToday
                  ? "bg-gradient-to-b from-forest-700 to-forest-800 text-white shadow-[0_6px_16px_-6px_rgba(13,31,20,0.45)]"
                  : isSnow
                    ? "border border-ice-500/40 bg-ice-100/50"
                    : "border border-border-subtle"
              }`}
              title={label}
            >
              <p className={`text-[10px] font-medium uppercase ${isToday ? "text-forest-100/70" : "text-forest-950/60"}`}>
                {isToday ? "Today" : format(new Date(day.date), "EEE")}
              </p>
              <p className="text-xl leading-tight my-1">{icon}</p>
              <p className={`text-xs font-semibold ${isToday ? "text-white" : "text-forest-950"}`}>{day.tempMaxF}°</p>
              <p className={`text-[10px] ${isToday ? "text-forest-100/50" : "text-forest-950/40"}`}>{day.tempMinF}°</p>
              {isSnow ? (
                <p className={`text-[10px] font-medium mt-1 ${isToday ? "text-gold-500" : "text-ice-600"}`}>
                  {day.snowfallIn.toFixed(1)}&quot;
                </p>
              ) : (
                <p className={`text-[10px] mt-1 ${isToday ? "text-forest-100/50" : "text-forest-950/40"}`}>{label}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
