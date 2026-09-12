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
        <h2 className="font-semibold text-forest-950">{hq.label} — 7-Day Forecast</h2>
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
          return (
            <div
              key={day.date}
              className={`rounded-lg border p-2 text-center ${
                isSnow ? "border-ice-500/40 bg-ice-100/50" : "border-border-subtle"
              }`}
              title={label}
            >
              <p className="text-[10px] font-medium text-forest-950/60 uppercase">
                {i === 0 ? "Today" : format(new Date(day.date), "EEE")}
              </p>
              <p className="text-xl leading-tight my-1">{icon}</p>
              <p className="text-xs font-semibold text-forest-950">{day.tempMaxF}°</p>
              <p className="text-[10px] text-forest-950/40">{day.tempMinF}°</p>
              {isSnow ? (
                <p className="text-[10px] font-medium text-ice-600 mt-1">
                  {day.snowfallIn.toFixed(1)}&quot;
                </p>
              ) : (
                <p className="text-[10px] text-forest-950/40 mt-1">{label}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
