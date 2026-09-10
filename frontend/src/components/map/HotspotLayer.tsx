"use client";

import React, { useEffect, useState, useRef } from "react";
import { CircleMarker, Popup, Tooltip } from "react-leaflet";
import { getRiskColor, getRiskConfig } from "./riskColors";
import { Flame, AlertCircle, ShieldAlert } from "lucide-react";

export interface HotspotRecord {
  latitude: number;
  longitude: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  crimeCount: number;
}

export interface HotspotLayerProps {
  visible?: boolean;
  onDataLoaded?: (hotspots: HotspotRecord[]) => void;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

// Fallback seed hotspots for robust rendering if offline/local demo
const FALLBACK_HOTSPOTS: HotspotRecord[] = [
  { latitude: 28.6433, longitude: 77.2144, riskLevel: "HIGH", crimeCount: 28 }, // Paharganj
  { latitude: 28.6506, longitude: 77.2303, riskLevel: "CRITICAL", crimeCount: 42 }, // Chandni Chowk
  { latitude: 28.6514, longitude: 77.1907, riskLevel: "MEDIUM", crimeCount: 14 }, // Karol Bagh
  { latitude: 28.6734, longitude: 77.2885, riskLevel: "CRITICAL", crimeCount: 38 }, // Shahdara
  { latitude: 28.6289, longitude: 77.2065, riskLevel: "HIGH", crimeCount: 22 }, // New Delhi Railway
  { latitude: 28.5700, longitude: 77.2200, riskLevel: "MEDIUM", crimeCount: 11 }, // INA / South Ext
  { latitude: 28.5244, longitude: 77.1855, riskLevel: "LOW", crimeCount: 4 }, // Hauz Khas
  { latitude: 28.6850, longitude: 77.1200, riskLevel: "HIGH", crimeCount: 19 }, // Rohini
  { latitude: 28.4595, longitude: 77.0266, riskLevel: "LOW", crimeCount: 3 }, // Cyber Hub Gurugram
  { latitude: 28.5708, longitude: 77.3260, riskLevel: "MEDIUM", crimeCount: 12 }, // Sector 18 Noida
];

export const HotspotLayer: React.FC<HotspotLayerProps> = ({
  visible = true,
  onDataLoaded,
}) => {
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Lazy-load: Fetch only on first time visible === true
  useEffect(() => {
    if (!visible || hasFetched || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    fetch(`${API_BASE}/api/hotspots`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Hotspots API returned status ${res.status}`);
        }
        const data = await res.json();
        const records: HotspotRecord[] = Array.isArray(data) ? data : data.hotspots || FALLBACK_HOTSPOTS;
        setHotspots(records);
        setHasFetched(true);
        if (onDataLoaded) onDataLoaded(records);
      })
      .catch((err) => {
        console.warn("[HotspotLayer] Using fallback precomputed hotspots:", err);
        setHotspots(FALLBACK_HOTSPOTS);
        setHasFetched(true);
        if (onDataLoaded) onDataLoaded(FALLBACK_HOTSPOTS);
      })
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  }, [visible, hasFetched, onDataLoaded]);

  // If toggled off, do not render elements, but maintain cached state
  if (!visible) {
    return null;
  }

  return (
    <>
      {hotspots.map((item, index) => {
        const color = getRiskColor(item.riskLevel);
        const config = getRiskConfig(item.riskLevel);

        // Radius scaled smoothly by crime count (min 10px, max 34px)
        const radius = Math.max(10, Math.min(34, 8 + Math.sqrt(Math.max(1, item.crimeCount)) * 3.8));

        return (
          <CircleMarker
            key={`hotspot-${index}-${item.latitude}-${item.longitude}`}
            center={[item.latitude, item.longitude]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.38,
              weight: 2,
              dashArray: item.riskLevel === "CRITICAL" ? "4, 4" : undefined,
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]}>
              <div className="text-xs font-medium">
                <span className="font-bold">{config.emoji} {item.riskLevel} Hotspot</span>
                <div className="text-[11px] text-slate-600">
                  {item.crimeCount} incident{item.crimeCount === 1 ? "" : "s"}
                </div>
              </div>
            </Tooltip>

            <Popup>
              <div className="p-2 min-w-[210px] text-slate-900">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: color }}
                  >
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight text-slate-800">
                      Crime Hotspot Zone
                    </h4>
                    <span
                      className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5"
                      style={{
                        backgroundColor: config.fillHex,
                        color: config.borderHex,
                        border: `1px solid ${color}`,
                      }}
                    >
                      {config.emoji} {item.riskLevel} RISK
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Incident Count:</span>
                    <strong className="font-mono text-slate-900">{item.crimeCount} recorded</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Coordinates:</span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 italic">
                    {config.description}
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};

export default HotspotLayer;
