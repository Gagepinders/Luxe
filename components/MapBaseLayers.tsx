"use client";

import { LayersControl, TileLayer } from "react-leaflet";

export default function MapBaseLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Satellite">
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={19}
          maxZoom={21}
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Street map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}
