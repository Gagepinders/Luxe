"use client";

import { MapContainer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteStop } from "@/components/RoutePlanner";
import MapBaseLayers from "@/components/MapBaseLayers";

// A single pin's label — "3" for a lone stop, "3·4" when multiple jobs
// share the exact same property (a Marker at an identical position would
// otherwise render directly on top of the previous one, hiding it
// completely rather than just overlapping visually).
function numberedIcon(label: string, color: string) {
  const width = label.length > 1 ? 22 + label.length * 7 : 26;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${width}px;height:26px;border-radius:13px;background:${color};color:white;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);padding:0 2px">${label}</div>`,
    iconSize: [width, 26],
    iconAnchor: [width / 2, 13],
  });
}

// Group stops that share the same property (rounded to ~1m precision) so
// each property gets exactly one marker, labeled with every stop number
// that visits it, instead of one marker per job silently burying the rest.
function groupByLocation(stops: RouteStop[]) {
  const groups = new Map<string, { lat: number; lng: number; members: { index: number; stop: RouteStop }[] }>();
  stops.forEach((s, i) => {
    const key = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;
    const existing = groups.get(key);
    if (existing) existing.members.push({ index: i, stop: s });
    else groups.set(key, { lat: s.lat, lng: s.lng, members: [{ index: i, stop: s }] });
  });
  return Array.from(groups.values());
}

const depotIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:#0d1f14;color:#c9a227;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)">HQ</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function RouteMap({
  stops,
  depot,
}: {
  stops: RouteStop[];
  depot: [number, number];
}) {
  const center: [number, number] = stops.length > 0 ? [stops[0].lat, stops[0].lng] : depot;
  const path: [number, number][] = [depot, ...stops.map((s) => [s.lat, s.lng] as [number, number])];

  return (
    <div className="map-shell" style={{ height: 460 }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        dragging
        doubleClickZoom
        touchZoom
        maxZoom={21}
      >
        <MapBaseLayers />
        <Marker position={depot} icon={depotIcon}>
          <Tooltip>Luxe Landscape & Snow — home base</Tooltip>
        </Marker>
        {groupByLocation(stops).map((group) => (
          <Marker
            key={group.members.map((m) => m.stop.id).join("-")}
            position={[group.lat, group.lng]}
            icon={numberedIcon(group.members.map((m) => m.index + 1).join("·"), "#235233")}
          >
            <Tooltip>
              {group.members.map((m) => (
                <div key={m.stop.id}>
                  {m.index + 1}. {m.stop.title} — {m.stop.customerName}
                </div>
              ))}
            </Tooltip>
          </Marker>
        ))}
        {path.length > 1 && (
          <Polyline positions={path} pathOptions={{ color: "#c9a227", weight: 3, dashArray: "6 6" }} />
        )}
      </MapContainer>
    </div>
  );
}
