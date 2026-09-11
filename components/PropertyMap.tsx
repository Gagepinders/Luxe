"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import { Trash2, Undo2 } from "lucide-react";

export type Measurement = {
  id: string;
  label: string;
  type: "lawn" | "driveway" | "walkway" | "other";
  sqft: number;
  points: [number, number][]; // [lat, lng]
};

type Props = {
  initialLat: number;
  initialLng: number;
  initialMeasurements: Measurement[];
  hiddenInputName: string;
  readOnly?: boolean;
};

const DEFAULT_CENTER: [number, number] = [44.4759, -73.2121]; // Burlington, VT

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#c9a227;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const TYPE_COLORS: Record<Measurement["type"], string> = {
  lawn: "#3a8752",
  driveway: "#6b7280",
  walkway: "#a9821c",
  other: "#3e8fb0",
};

function sqmToSqft(sqm: number) {
  return sqm * 10.7639;
}

function DrawController({
  drawing,
  onAddPoint,
}: {
  drawing: boolean;
  onAddPoint: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (drawing) onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function FlyToPin({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 20));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.[0], position?.[1]]);
  return null;
}

function LocationPicker({
  onPick,
}: {
  onPick: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function PropertyMap({
  initialLat,
  initialLng,
  initialMeasurements,
  hiddenInputName,
  readOnly = false,
}: Props) {
  const hasLocation = initialLat !== 0 || initialLng !== 0;
  const [center] = useState<[number, number]>(
    hasLocation ? [initialLat, initialLng] : DEFAULT_CENTER
  );
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(
    hasLocation ? [initialLat, initialLng] : null
  );
  const [measurements, setMeasurements] = useState<Measurement[]>(
    initialMeasurements
  );
  const [drawing, setDrawing] = useState(false);
  const [placingPin, setPlacingPin] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [label, setLabel] = useState("Lawn");
  const [type, setType] = useState<Measurement["type"]>("lawn");

  const payload = useMemo(() => {
    const totalSqft = measurements.reduce((s, m) => s + m.sqft, 0);
    return JSON.stringify({
      lat: markerPos?.[0] ?? null,
      lng: markerPos?.[1] ?? null,
      measurements,
      lawnSqft: measurements.filter((m) => m.type === "lawn").reduce((s, m) => s + m.sqft, 0),
      driveSqft: measurements
        .filter((m) => m.type === "driveway")
        .reduce((s, m) => s + m.sqft, 0),
      walkwaySqft: measurements
        .filter((m) => m.type === "walkway")
        .reduce((s, m) => s + m.sqft, 0),
      totalAcres: totalSqft / 43560,
    });
  }, [markerPos, measurements]);

  const currentAreaSqft = useMemo(() => {
    if (currentPoints.length < 3) return 0;
    const ring = [...currentPoints.map((p) => [p[1], p[0]]), [
      currentPoints[0][1],
      currentPoints[0][0],
    ]];
    const poly = turf.polygon([ring]);
    return sqmToSqft(turf.area(poly));
  }, [currentPoints]);

  function finishShape() {
    if (currentPoints.length < 3) {
      setDrawing(false);
      setCurrentPoints([]);
      return;
    }
    const m: Measurement = {
      id: Math.random().toString(36).slice(2),
      label: label || "Area",
      type,
      sqft: Math.round(currentAreaSqft),
      points: currentPoints,
    };
    const next = [...measurements, m];
    setMeasurements(next);
    setCurrentPoints([]);
    setDrawing(false);
  }

  function removeMeasurement(id: string) {
    setMeasurements((ms) => ms.filter((m) => m.id !== id));
  }

  function undoPoint() {
    setCurrentPoints((pts) => pts.slice(0, -1));
  }

  function handlePin(latlng: [number, number]) {
    setMarkerPos(latlng);
    setPlacingPin(false);
  }

  const totalSqft = measurements.reduce((s, m) => s + m.sqft, 0);

  return (
    <div className="space-y-3">
      {!readOnly && (
        <input type="hidden" name={hiddenInputName} value={payload} readOnly />
      )}

      {!readOnly && (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPlacingPin((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
            placingPin
              ? "border-gold-500 bg-gold-100 text-gold-600"
              : "border-border-subtle bg-surface text-forest-950/80 hover:bg-surface-muted"
          }`}
        >
          {placingPin ? "Click map to set pin…" : "Set property pin"}
        </button>

        <select
          value={type}
          onChange={(e) => {
            const t = e.target.value as Measurement["type"];
            setType(t);
            setLabel(t.charAt(0).toUpperCase() + t.slice(1));
          }}
          className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
        >
          <option value="lawn">Lawn</option>
          <option value="driveway">Driveway</option>
          <option value="walkway">Walkway</option>
          <option value="other">Other</option>
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-28 rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
          placeholder="Label"
        />

        {!drawing ? (
          <button
            type="button"
            onClick={() => setDrawing(true)}
            className="rounded-lg bg-forest-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-800"
          >
            + Measure area
          </button>
        ) : (
          <>
            <span className="text-xs text-forest-950/60">
              Click map to place points ({currentPoints.length}) — {Math.round(currentAreaSqft).toLocaleString()} sq ft
            </span>
            <button
              type="button"
              onClick={undoPoint}
              className="rounded-lg border border-border-subtle px-2 py-1.5 text-xs hover:bg-surface-muted"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={finishShape}
              className="rounded-lg bg-forest-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-800"
            >
              Finish shape
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawing(false);
                setCurrentPoints([]);
              }}
              className="rounded-lg border border-border-subtle px-2 py-1.5 text-xs hover:bg-surface-muted"
            >
              Cancel
            </button>
          </>
        )}
      </div>
      )}

      <div className="map-shell" style={{ height: 380 }}>
        <MapContainer
          center={center}
          zoom={hasLocation ? 19 : 12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={!readOnly}
          dragging={!readOnly}
          doubleClickZoom={!readOnly}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!readOnly && placingPin && <LocationPicker onPick={handlePin} />}
          {!readOnly && (
            <DrawController
              drawing={drawing}
              onAddPoint={(p) => setCurrentPoints((pts) => [...pts, p])}
            />
          )}
          {!readOnly && <FlyToPin position={markerPos} />}
          {markerPos && <Marker position={markerPos} icon={pinIcon} />}
          {measurements.map((m) => (
            <Polygon
              key={m.id}
              positions={m.points}
              pathOptions={{ color: TYPE_COLORS[m.type], fillOpacity: 0.3 }}
            />
          ))}
          {currentPoints.length > 0 && (
            <Polygon
              positions={currentPoints}
              pathOptions={{ color: "#c9a227", dashArray: "4 4", fillOpacity: 0.15 }}
            />
          )}
        </MapContainer>
      </div>

      {measurements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {measurements.map((m) => (
            <span
              key={m.id}
              className="badge normal-case"
              style={{
                background: `${TYPE_COLORS[m.type]}1a`,
                color: TYPE_COLORS[m.type],
              }}
            >
              {m.label}: {m.sqft.toLocaleString()} sq ft
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeMeasurement(m.id)}
                  className="ml-1"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </span>
          ))}
          <span className="badge bg-surface-muted text-forest-950/70">
            Total: {totalSqft.toLocaleString()} sq ft ({(totalSqft / 43560).toFixed(2)} ac)
          </span>
        </div>
      )}
      {!readOnly && (
        <p className="text-xs text-forest-950/45">
          Click &ldquo;Set property pin&rdquo; then click the map to place the property marker. Click &ldquo;+ Measure area&rdquo;, then click the map to trace a shape (lawn, driveway, etc.) and click &ldquo;Finish shape&rdquo; to save it.
        </p>
      )}
    </div>
  );
}
