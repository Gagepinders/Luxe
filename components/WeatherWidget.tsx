import { getForecast, describeWeatherCode } from "@/lib/weather";
import { CloudSnow } from "lucide-react";
import { format } from "date-fns";

export default async function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  const forecast = await getForecast(lat, lng);
  if (!forecast) return null;

  const snowDays = forecast.filter((d) => d.snowfallIn > 0);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-forest-950">5-Day Forecast</h2>
        {snowDays.length > 0 && (
          <span className="badge bg-ice-100 text-ice-600 normal-case">
            <CloudSnow size={12} /> Snow expected — plan plowing
          </span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {forecast.map((day, i) => {
          const { label, icon } = describeWeatherCode(day.weatherCode);
          const isSnow = day.snowfallIn > 0;
          return (
            <div
              key={day.date}
              className={`rounded-lg border p-2 text-center ${
                isSnow ? "border-ice-500/40 bg-ice-100/50" : "border-border-subtle"
              }`}
            >
              <p className="text-[10px] font-medium text-forest-950/60 uppercase">
                {i === 0 ? "Today" : format(new Date(day.date), "EEE")}
              </p>
              <p className="text-xl leading-tight my-1">{icon}</p>
              <p className="text-xs font-semibold text-forest-950">{day.tempMaxF}°</p>
              <p className="text-[10px] text-forest-950/40">{day.tempMinF}°</p>
              {isSnow ? (
                <p className="text-[10px] font-medium text-ice-600 mt-1">
                  {day.snowfallIn.toFixed(1)}&quot; snow
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
