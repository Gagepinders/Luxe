"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteStop } from "@/components/RoutePlanner";

function numberedIcon(n: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${color};color:white;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
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
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={depot} icon={depotIcon}>
          <Tooltip>Luxe Landscape & Snow — home base</Tooltip>
        </Marker>
        {stops.map((s, i) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={numberedIcon(i + 1, "#235233")}>
            <Tooltip>
              {i + 1}. {s.title} — {s.customerName}
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
