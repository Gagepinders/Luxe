import { getMonitoredAreas } from "@/lib/monitoredAreas";
import { getForecastsForAreas } from "@/lib/weather";
import { getSnowDispatchCandidates } from "@/lib/snowDispatch";
import { dispatchSnowDay } from "@/app/actions/snowDispatch";
import { PageHeader, Button } from "@/components/ui";
import { CloudSnow, Truck } from "lucide-react";
import AreaForecastCard from "@/components/AreaForecastCard";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  const [areas, candidates] = await Promise.all([
    getMonitoredAreas(),
    getSnowDispatchCandidates(),
  ]);
  const withForecasts = await getForecastsForAreas(areas);
  const alertAreas = withForecasts.filter((a) => a.forecast?.isSnowDay);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Weather"
        subtitle="24/7 monitoring across every town you have properties in."
        icon={CloudSnow}
      />

      {alertAreas.length > 0 && (
        <div className="mb-6 rounded-lg border border-ice-500/40 bg-ice-100/60 px-4 py-3 flex items-start gap-2.5">
          <CloudSnow className="text-ice-600 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm">
            <p className="font-semibold text-forest-950">
              Snow expected in {alertAreas.length} area{alertAreas.length > 1 ? "s" : ""} — start
              planning plow routes.
            </p>
            <p className="text-forest-950/70 mt-0.5">
              {alertAreas
                .map((a) => `${a.label}: ${a.forecast!.snowNext48hIn.toFixed(1)}" in the next 48h`)
                .join(" · ")}
            </p>
          </div>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mb-6 card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Truck className="text-forest-700 mt-0.5 flex-shrink-0" size={18} />
            <div className="text-sm">
              <p className="font-semibold text-forest-950">
                {candidates.length} snow removal customer{candidates.length === 1 ? "" : "s"} not
                yet scheduled today.
              </p>
              <p className="text-forest-950/60 mt-0.5">
                Dispatches a job for each — for a storm hitting today, not the regular weekly clock.
              </p>
            </div>
          </div>
          <form action={dispatchSnowDay}>
            <Button type="submit">
              <Truck size={14} /> Dispatch all for today
            </Button>
          </form>
        </div>
      )}

      <div className="space-y-5">
        {withForecasts.map((area) => (
          <AreaForecastCard key={area.key} area={area} />
        ))}
      </div>
    </main>
  );
}
