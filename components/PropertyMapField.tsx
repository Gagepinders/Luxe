"use client";

import dynamic from "next/dynamic";

export type { Measurement, MeasurementType } from "@/components/PropertyMap";

const PropertyMap = dynamic(() => import("@/components/PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="map-shell flex items-center justify-center text-sm text-forest-950/50" style={{ height: 380 }}>
      Loading map…
    </div>
  ),
});

export default PropertyMap;
