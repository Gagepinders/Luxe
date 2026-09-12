import { format } from "date-fns";
import { CloudSnow, MapPin } from "lucide-react";
import { describeWeatherCode, type LocationForecast } from "@/lib/weather";

type Area = {
  key: string;
  label: string;
  propertyCount: number;
  forecast: LocationForecast | null;
};

export default function AreaForecastCard({ area }: { area: Area }) {
  const { forecast } = area;
  if (!forecast) {
    return (
      <section className="card p-5">
        <h2 className="font-semibold text-forest-950">{area.label}</h2>
        <p className="text-sm text-forest-950/50 mt-1">Forecast unavailable right now.</p>
      </section>
    );
  }

  const next24h = forecast.hourly.slice(0, 24);
  const current = next24h[0];
  const { label: currentLabel, icon: currentIcon } = describeWeatherCode(current?.weatherCode ?? -1);

  return (
    <section className={`card p-5 ${forecast.isSnowDay ? "border-ice-500/50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-forest-950/40" />
          <div>
            <h2 className="font-semibold text-forest-950">{area.label}</h2>
            <p className="text-xs text-forest-950/50">
              {area.propertyCount} propert{area.propertyCount === 1 ? "y" : "ies"} · {currentIcon}{" "}
              {currentLabel}, {current?.tempF ?? "—"}°
            </p>
          </div>
        </div>
        {forecast.isSnowDay && (
          <span className="badge bg-ice-100 text-ice-600 normal-case">
            <CloudSnow size={12} /> {forecast.snowNext48hIn.toFixed(1)}&quot; expected in 48h
          </span>
        )}
      </div>

      <p className="text-[11px] font-medium uppercase tracking-wide text-forest-950/45 mb-1.5">
        Next 24 hours
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {next24h.map((h, i) => {
          const { icon } = describeWeatherCode(h.weatherCode);
          const isSnow = h.snowfallIn > 0;
          return (
            <div
              key={h.time}
              className={`flex-shrink-0 w-14 rounded-lg border p-1.5 text-center ${
                isSnow ? "border-ice-500/40 bg-ice-100/50" : "border-border-subtle"
              }`}
            >
              <p className="text-[10px] font-medium text-forest-950/55">
                {i === 0 ? "Now" : format(new Date(h.time), "ha")}
              </p>
              <p className="text-base leading-tight my-0.5">{icon}</p>
              <p className="text-xs font-semibold text-forest-950">{h.tempF}°</p>
              {isSnow ? (
                <p className="text-[9px] font-medium text-ice-600">{h.snowfallIn.toFixed(1)}&quot;</p>
              ) : (
                <p className="text-[9px] text-forest-950/35">{h.precipChance}%</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-medium uppercase tracking-wide text-forest-950/45 mb-1.5 mt-4">
        7-day outlook · {forecast.snowNext7dIn.toFixed(1)}&quot; total snow
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {forecast.daily.map((day, i) => {
          const { icon, label } = describeWeatherCode(day.weatherCode);
          const isSnow = day.snowfallIn > 0;
          return (
            <div
              key={day.date}
              className={`rounded-lg border p-1.5 text-center ${
                isSnow ? "border-ice-500/40 bg-ice-100/50" : "border-border-subtle"
              }`}
              title={label}
            >
              <p className="text-[10px] font-medium text-forest-950/55">
                {i === 0 ? "Today" : format(new Date(day.date), "EEE")}
              </p>
              <p className="text-base leading-tight my-0.5">{icon}</p>
              <p className="text-[11px] font-semibold text-forest-950">{day.tempMaxF}°</p>
              <p className="text-[9px] text-forest-950/35">{day.tempMinF}°</p>
              {isSnow && (
                <p className="text-[9px] font-medium text-ice-600 mt-0.5">
                  {day.snowfallIn.toFixed(1)}&quot;
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
