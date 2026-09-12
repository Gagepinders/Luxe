"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUp, ArrowDown, Wand2, Save, MapPin } from "lucide-react";
import { setJobRouteOrder } from "@/app/actions/jobs";
import { formatCurrency } from "@/lib/format";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="map-shell flex items-center justify-center text-sm text-forest-950/50" style={{ height: 460 }}>
      Loading map…
    </div>
  ),
});

export type RouteStop = {
  id: string;
  title: string;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  crew: string | null;
  status: string;
};

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestNeighborOrder(stops: RouteStop[], depot: [number, number]): RouteStop[] {
  const remaining = [...stops];
  const ordered: RouteStop[] = [];
  let current: [number, number] = depot;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = haversine(current, [s.lat, s.lng]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    current = [next.lat, next.lng];
  }
  return ordered;
}

export default function RoutePlanner({
  stops,
  missingCount,
  depot,
}: {
  stops: RouteStop[];
  missingCount: number;
  depot: [number, number];
}) {
  const [order, setOrder] = useState<RouteStop[]>(stops);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const totalDistance = useMemo(() => {
    let dist = 0;
    let current = depot;
    for (const s of order) {
      dist += haversine(current, [s.lat, s.lng]);
      current = [s.lat, s.lng];
    }
    return dist;
  }, [order, depot]);

  const totalValue = order.reduce((s, o) => s + o.price, 0);

  function move(index: number, dir: -1 | 1) {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setSaved(false);
  }

  function optimize() {
    setOrder(nearestNeighborOrder(order, depot));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await setJobRouteOrder(order.map((o) => o.id));
      setSaved(true);
    });
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <RouteMap stops={order} depot={depot} />
        {missingCount > 0 && (
          <p className="text-xs text-warning bg-warning-100 rounded-lg px-3 py-2">
            {missingCount} job{missingCount === 1 ? "" : "s"} today have no property location set and
            aren&rsquo;t shown on the map. Add a pin on the property page to include them in routing.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-forest-950">
              {order.length} stop{order.length === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={optimize}
                className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-medium hover:bg-surface-muted"
              >
                <Wand2 size={13} /> Optimize
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-lg bg-forest-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-forest-800 disabled:opacity-60"
              >
                <Save size={13} /> {pending ? "Saving…" : saved ? "Saved" : "Save order"}
              </button>
            </div>
          </div>
          <p className="text-xs text-forest-950/50 mb-3">
            ~{totalDistance.toFixed(1)} km driving · {formatCurrency(totalValue)} scheduled
          </p>

          {order.length === 0 ? (
            <p className="text-sm text-forest-950/50">No mapped jobs for this day.</p>
          ) : (
            <ol className="space-y-2">
              {order.map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-start gap-2 rounded-lg border border-border-subtle p-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-700 text-[10px] font-semibold text-white mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${s.id}`} className="text-sm font-medium text-forest-950 truncate block">
                      {s.title}
                    </Link>
                    <p className="text-xs text-forest-950/50 flex items-center gap-1 truncate">
                      <MapPin size={11} /> {s.address}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-forest-950/40 hover:text-forest-700 disabled:opacity-30"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
                      className="text-forest-950/40 hover:text-forest-700 disabled:opacity-30"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
