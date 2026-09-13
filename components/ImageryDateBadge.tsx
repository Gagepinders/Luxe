"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Esri's World Imagery basemap is stitched together from many different
// aerial/satellite flights, each with its own capture date — so "how
// current is this?" only has a real answer for wherever the map is
// currently centered, not the whole world at once. This queries Esri's
// identify API for that point (the same metadata Esri itself uses to
// credit imagery providers) and shows it bottom-left, the way Google Maps
// shows its own imagery date.
function formatDate(yyyymmdd: string | undefined) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  const year = yyyymmdd.slice(0, 4);
  const month = Number(yyyymmdd.slice(4, 6)) - 1;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[month] ?? ""} ${year}`.trim();
}

export default function ImageryDateBadge() {
  const map = useMap();
  const [label, setLabel] = useState<string | null>(null);
  const [satelliteActive, setSatelliteActive] = useState(true); // matches the "checked" default base layer
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const control = new L.Control({ position: "bottomleft" });
    control.onAdd = () => {
      const div = L.DomUtil.create("div", "imagery-date-badge");
      L.DomEvent.disableClickPropagation(div);
      setContainer(div);
      return div;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);

  const refresh = useCallback(async () => {
    if (map.getZoom() < 15) {
      setLabel(null);
      return;
    }
    const center = map.getCenter();
    const bounds = map.getBounds();
    const size = map.getSize();
    const params = new URLSearchParams({
      geometry: `${center.lng},${center.lat}`,
      geometryType: "esriGeometryPoint",
      sr: "4326",
      tolerance: "2",
      mapExtent: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
      imageDisplay: `${size.x},${size.y},96`,
      returnGeometry: "false",
      f: "json",
    });
    try {
      const res = await fetch(
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/identify?${params}`
      );
      const data = await res.json();
      const attrs = data?.results?.[0]?.attributes;
      const date = formatDate(attrs?.["DATE (YYYYMMDD)"]);
      setLabel(date ? `Imagery: ${date}${attrs?.SOURCE ? ` (${attrs.SOURCE})` : ""}` : null);
    } catch {
      setLabel(null);
    }
  }, [map]);

  useEffect(() => {
    // Deferred rather than called directly — refresh() can set state
    // synchronously (the early-return zoom check) before its first await.
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useMapEvents({
    moveend() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(refresh, 400);
    },
    baselayerchange(e) {
      setSatelliteActive(e.name === "Satellite");
    },
  });

  if (!container || !label || !satelliteActive) return null;
  return createPortal(
    <div
      style={{
        background: "rgba(255,255,255,.9)",
        padding: "3px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        color: "#333",
        boxShadow: "0 1px 3px rgba(0,0,0,.3)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>,
    container
  );
}
