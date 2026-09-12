"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import MapBaseLayers from "@/components/MapBaseLayers";

type PropertyPin = {
  id: string;
  customerName: string;
  customerStatus: string; // active | inactive | lead
  label: string;
  addressLine: string;
  city: string;
  lat: number;
  lng: number;
};

type Hq = { label: string; lat: number; lng: number };

type SearchResult = { displayName: string; lat: number; lng: number };

function pinIconFor(status: string) {
  const color = status === "lead" ? "#c9a227" : status === "inactive" ? "#6b7280" : "#235233";
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const hqIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#0d1f14;border:2px solid #c9a227;box-shadow:0 1px 4px rgba(0,0,0,.4);font-size:13px">🏠</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const searchIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function FlyToTarget({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 19);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.[0], target?.[1]]);
  return null;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function PropertiesMap({
  properties,
  hq,
}: {
  properties: PropertyPin[];
  hq: Hq;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results?.length > 0) {
        setResults(data.results);
        setSelected(data.results[0]);
      } else {
        setSelected(null);
        setError("No matches found for that address.");
      }
    } catch {
      setError("Search failed — try again.");
    } finally {
      setSearching(false);
    }
  }

  const center: [number, number] = [hq.lat, hq.lng];

  return (
    <div className="space-y-3">
      <form onSubmit={runSearch} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-950/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an address to find it on the map…"
            className="w-full rounded-lg border border-border-subtle bg-surface pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
        {selected && (
          <Link
            href={`/properties/new?address=${encodeURIComponent(selected.displayName)}&lat=${selected.lat}&lng=${selected.lng}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            <Plus size={14} /> Add as property
          </Link>
        )}
      </form>

      {error && <p className="text-xs text-danger">{error}</p>}

      {results.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(r)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                selected === r
                  ? "border-forest-700 bg-forest-700/10 text-forest-700"
                  : "border-border-subtle text-forest-950/60 hover:bg-surface-muted"
              }`}
            >
              {r.displayName.split(",").slice(0, 2).join(",")}
            </button>
          ))}
        </div>
      )}

      <div className="map-shell" style={{ height: 600 }}>
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
          <FlyToTarget target={selected ? [selected.lat, selected.lng] : null} />

          <Marker position={[hq.lat, hq.lng]} icon={hqIcon}>
            <Popup>{hq.label}</Popup>
          </Marker>

          {properties.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIconFor(p.customerStatus)}>
              <Popup>
                <div style={{ fontSize: 13 }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>{p.customerName}</p>
                  <p style={{ margin: "2px 0", color: "#555" }}>
                    {p.label} — {p.addressLine}
                    {p.city ? `, ${p.city}` : ""}
                  </p>
                  <a href={`/properties/${p.id}`} style={{ fontSize: 12 }}>
                    View property →
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          {selected && (
            <Marker position={[selected.lat, selected.lng]} icon={searchIcon}>
              <Popup>{selected.displayName}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-forest-950/50">
        <LegendDot color="#0d1f14" label="HQ" />
        <LegendDot color="#235233" label="Active customer" />
        <LegendDot color="#c9a227" label="Lead" />
        <LegendDot color="#6b7280" label="Inactive" />
        <LegendDot color="#dc2626" label="Search result" />
      </div>
    </div>
  );
}
