"use client";

import dynamic from "next/dynamic";

const PropertiesMap = dynamic(() => import("@/components/PropertiesMap"), {
  ssr: false,
  loading: () => (
    <div className="map-shell flex items-center justify-center text-sm text-forest-950/50" style={{ height: 600 }}>
      Loading map…
    </div>
  ),
});

export default PropertiesMap;
