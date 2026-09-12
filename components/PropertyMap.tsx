"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import { Trash2, Undo2 } from "lucide-react";
import MapBaseLayers from "@/components/MapBaseLayers";

export type MeasurementType =
  | "lawn"
  | "driveway"
  | "walkway"
  | "mulch_bed"
  | "garden_bed"
  | "obstacle"
  | "other";

export type Measurement = {
  id: string;
  label: string;
  type: MeasurementType;
  sqft: number;
  points: [number, number][]; // [lat, lng]; a single point for "obstacle"
};

type Props = {
  initialLat: number;
  initialLng: number;
  initialMeasurements: Measurement[];
  hiddenInputName: string;
  readOnly?: boolean;
};

const DEFAULT_CENTER: [number, number] = [44.5063689, -73.059018]; // Luxe HQ, Essex Junction VT

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#c9a227;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const OBSTACLE_ICONS: Record<string, string> = {
  Tree: "🌳",
  "Septic Cover": "🚫",
  "Sprinkler Head": "💧",
  "Water Meter": "🔧",
  Well: "⭕",
  "Utility Box": "⚡",
  Rocks: "🪨",
  Other: "⚠️",
};

function obstacleIcon(label: string) {
  const emoji = OBSTACLE_ICONS[label] ?? "⚠️";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#dc2626;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);font-size:13px">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export const TYPE_LABELS: Record<MeasurementType, string> = {
  lawn: "Lawn",
  driveway: "Driveway",
  walkway: "Walkway",
  mulch_bed: "Mulch Bed",
  garden_bed: "Garden Bed",
  obstacle: "Obstacle",
  other: "Other",
};

export const TYPE_COLORS: Record<MeasurementType, string> = {
  lawn: "#3a8752",
  driveway: "#6b7280",
  walkway: "#a9821c",
  mulch_bed: "#92400e",
  garden_bed: "#7c3aed",
  obstacle: "#dc2626",
  other: "#3e8fb0",
};

const OBSTACLE_LABEL_OPTIONS = Object.keys(OBSTACLE_ICONS);

function sqmToSqft(sqm: number) {
  return sqm * 10.7639;
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

// Stays mounted for the lifetime of the map (never conditionally added/removed),
// so a click's own state update can't unmount the very listener handling it.
// Mode/callbacks are read from refs so the map event subscription itself never churns.
function MapClickRouter({
  drawing,
  placingPin,
  placingObstacle,
  onAddPoint,
  onPick,
  onObstacle,
}: {
  drawing: boolean;
  placingPin: boolean;
  placingObstacle: boolean;
  onAddPoint: (latlng: [number, number]) => void;
  onPick: (latlng: [number, number]) => void;
  onObstacle: (latlng: [number, number]) => void;
}) {
  const stateRef = useRef({ drawing, placingPin, placingObstacle });
  const callbacksRef = useRef({ onAddPoint, onPick, onObstacle });
  useEffect(() => {
    stateRef.current = { drawing, placingPin, placingObstacle };
    callbacksRef.current = { onAddPoint, onPick, onObstacle };
  }, [drawing, placingPin, placingObstacle, onAddPoint, onPick, onObstacle]);

  useMapEvents({
    click(e) {
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
      const { drawing, placingPin, placingObstacle } = stateRef.current;
      if (placingPin) callbacksRef.current.onPick(latlng);
      else if (placingObstacle) callbacksRef.current.onObstacle(latlng);
      else if (drawing) callbacksRef.current.onAddPoint(latlng);
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
  const [placingObstacle, setPlacingObstacle] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [label, setLabel] = useState("Lawn");
  const [type, setType] = useState<MeasurementType>("lawn");

  const payload = useMemo(() => {
    const totalSqft = measurements.reduce((s, m) => s + m.sqft, 0);
    const sumType = (t: MeasurementType) =>
      measurements.filter((m) => m.type === t).reduce((s, m) => s + m.sqft, 0);
    return JSON.stringify({
      lat: markerPos?.[0] ?? null,
      lng: markerPos?.[1] ?? null,
      measurements,
      lawnSqft: sumType("lawn"),
      driveSqft: sumType("driveway"),
      walkwaySqft: sumType("walkway"),
      mulchSqft: sumType("mulch_bed"),
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
    setMeasurements((ms) => [...ms, m]);
    setCurrentPoints([]);
    setDrawing(false);
  }

  function addObstacle(point: [number, number]) {
    const m: Measurement = {
      id: Math.random().toString(36).slice(2),
      label: label || "Obstacle",
      type: "obstacle",
      sqft: 0,
      points: [point],
    };
    setMeasurements((ms) => [...ms, m]);
    setPlacingObstacle(false);
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

  function handleTypeChange(t: MeasurementType) {
    setType(t);
    setLabel(t === "obstacle" ? "Tree" : TYPE_LABELS[t]);
    setDrawing(false);
    setCurrentPoints([]);
    setPlacingObstacle(false);
  }

  const totalSqft = measurements.reduce((s, m) => s + m.sqft, 0);
  const isObstacleType = type === "obstacle";

  return (
    <div className="space-y-3">
      {!readOnly && (
        <input type="hidden" name={hiddenInputName} value={payload} readOnly />
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlacingPin((v) => !v);
              setPlacingObstacle(false);
              setDrawing(false);
            }}
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
            onChange={(e) => handleTypeChange(e.target.value as MeasurementType)}
            className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
          >
            {(Object.keys(TYPE_LABELS) as MeasurementType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          {isObstacleType ? (
            <input
              list="obstacle-labels"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-32 rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
              placeholder="Obstacle"
            />
          ) : (
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-28 rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
              placeholder="Label"
            />
          )}
          <datalist id="obstacle-labels">
            {OBSTACLE_LABEL_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>

          {isObstacleType ? (
            <button
              type="button"
              onClick={() => {
                setPlacingObstacle((v) => !v);
                setPlacingPin(false);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                placingObstacle
                  ? "border border-danger bg-danger-100 text-danger"
                  : "bg-forest-700 text-white hover:bg-forest-800"
              }`}
            >
              {placingObstacle ? "Click map to place…" : "+ Mark obstacle"}
            </button>
          ) : !drawing ? (
            <button
              type="button"
              onClick={() => {
                setDrawing(true);
                setPlacingPin(false);
              }}
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

      <div className="map-shell" style={{ height: 420 }}>
        <MapContainer
          center={center}
          zoom={hasLocation ? 19 : 13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          dragging
          doubleClickZoom
          touchZoom
          maxZoom={21}
        >
          <MapBaseLayers />
          {!readOnly && (
            <MapClickRouter
              drawing={drawing}
              placingPin={placingPin}
              placingObstacle={placingObstacle}
              onAddPoint={(p) => setCurrentPoints((pts) => [...pts, p])}
              onPick={handlePin}
              onObstacle={addObstacle}
            />
          )}
          {!readOnly && <FlyToPin position={markerPos} />}
          {markerPos && <Marker position={markerPos} icon={pinIcon} />}
          {measurements
            .filter((m) => m.type !== "obstacle")
            .map((m) => (
              <Polygon
                key={m.id}
                positions={m.points}
                pathOptions={{ color: TYPE_COLORS[m.type], fillOpacity: 0.35, weight: 2 }}
              >
                <Tooltip sticky>
                  {m.label} — {m.sqft.toLocaleString()} sq ft
                </Tooltip>
              </Polygon>
            ))}
          {measurements
            .filter((m) => m.type === "obstacle")
            .map((m) => (
              <Marker key={m.id} position={m.points[0]} icon={obstacleIcon(m.label)}>
                <Tooltip>{m.label}</Tooltip>
              </Marker>
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
              {m.label}
              {m.type !== "obstacle" && `: ${m.sqft.toLocaleString()} sq ft`}
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
          Always shows current satellite imagery by default. Set the pin, pick a type, then trace
          an area or mark an obstacle. Drag to pan, scroll or pinch to zoom.
        </p>
      )}
    </div>
  );
}
