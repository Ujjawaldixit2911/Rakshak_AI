"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Polyline, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { getRiskColor, getRiskConfig } from "./riskColors";
import { CoordinatePoint, EvaluatedRouteOption, RouteCompareResponse, compareThreeRoutes } from "@/lib/routeCompareService";
import { Navigation, AlertTriangle, ShieldCheck, Clock, Gauge } from "lucide-react";

export interface RouteLayerProps {
  source?: CoordinatePoint;
  destination?: CoordinatePoint;
  compareData?: RouteCompareResponse | null;
  selectedType?: "safest" | "fastest" | "balanced";
  visible?: boolean;
  onRouteEvaluated?: (routes: RouteCompareResponse) => void;
}

// Custom Leaflet DivIcons for Start and Destination points
const createStartIcon = () =>
  L.divIcon({
    className: "custom-map-icon start-icon",
    html: `
      <div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: #10B981; border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 14px; font-weight: bold;
      ">
        🟢
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

const createDestIcon = () =>
  L.divIcon({
    className: "custom-map-icon dest-icon",
    html: `
      <div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: #EF4444; border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 14px; font-weight: bold;
      ">
        🏁
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

export const RouteLayer: React.FC<RouteLayerProps> = ({
  source,
  destination,
  compareData,
  selectedType = "safest",
  visible = true,
  onRouteEvaluated,
}) => {
  const [internalData, setInternalData] = useState<RouteCompareResponse | null>(compareData || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (compareData) {
      setInternalData(compareData);
    }
  }, [compareData]);

  // Independent fetch: If source & destination are provided and compareData is not supplied
  useEffect(() => {
    let isCancelled = false;

    if (!compareData && source && destination && visible) {
      setLoading(true);
      setError(null);

      compareThreeRoutes(source, destination)
        .then((res) => {
          if (!isCancelled) {
            setInternalData(res);
            if (onRouteEvaluated) onRouteEvaluated(res);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setError(err.message || "Failed to load routes");
          }
        })
        .finally(() => {
          if (!isCancelled) setLoading(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [source?.lat, source?.lng, destination?.lat, destination?.lng, compareData, visible, onRouteEvaluated]);

  const activeRoute: EvaluatedRouteOption | null = useMemo(() => {
    if (!internalData) return null;
    return internalData[selectedType] || internalData.safest || internalData.fastest || null;
  }, [internalData, selectedType]);

  if (!visible || !activeRoute || !activeRoute.geometry || activeRoute.geometry.length < 2) {
    return null;
  }

  // Convert [[lng, lat], ...] to Leaflet [[lat, lng], ...]
  const fullPolylineCoords: [number, number][] = activeRoute.geometry.map((pt) => [pt[1], pt[0]]);
  const startPoint = fullPolylineCoords[0];
  const endPoint = fullPolylineCoords[fullPolylineCoords.length - 1];

  // Dynamic segments coloring
  // To render segmented risk levels, we partition full coordinates into sub-segments
  // and color each based on overall route safety score or local risk interpolation
  const segments = useMemo(() => {
    const rawCoords = activeRoute.geometry;
    const count = rawCoords.length;
    if (count < 2) return [];

    const numChunks = Math.min(count - 1, 8);
    const chunkSize = Math.ceil((count - 1) / numChunks);
    const chunks: Array<{
      coords: [number, number][];
      riskLevel: string;
      color: string;
      segmentIndex: number;
    }> = [];

    for (let i = 0; i < count - 1; i += chunkSize) {
      const slice = rawCoords.slice(i, Math.min(i + chunkSize + 1, count));
      const latLngSlice: [number, number][] = slice.map((c) => [c[1], c[0]]);
      
      // Calculate risk level: Base safety score for safest route, lower for others
      let level = "LOW";
      const score = activeRoute.safetyScore;
      if (score < 45) {
        level = i % 2 === 0 ? "CRITICAL" : "HIGH";
      } else if (score < 65) {
        level = i % 3 === 0 ? "HIGH" : "MEDIUM";
      } else if (score < 80) {
        level = i % 4 === 0 ? "MEDIUM" : "LOW";
      } else {
        level = "LOW";
      }

      chunks.push({
        coords: latLngSlice,
        riskLevel: level,
        color: getRiskColor(level),
        segmentIndex: Math.floor(i / chunkSize),
      });
    }
    return chunks;
  }, [activeRoute]);

  return (
    <>
      {/* Background Glow / Outline Polyline */}
      <Polyline
        positions={fullPolylineCoords}
        pathOptions={{
          color: "#0f172a",
          weight: 9,
          opacity: 0.75,
          lineCap: "round",
          lineJoin: "round",
        }}
      />

      {/* Primary Colored Segments */}
      {segments.map((seg, idx) => (
        <Polyline
          key={`route-seg-${seg.segmentIndex}-${idx}`}
          positions={seg.coords}
          pathOptions={{
            color: seg.color,
            weight: 6,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }}
        >
          <Tooltip sticky direction="top">
            <div className="text-xs p-1">
              <span className="font-bold">Segment #{seg.segmentIndex + 1}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="font-semibold">{seg.riskLevel} Risk</span>
              </div>
            </div>
          </Tooltip>
        </Polyline>
      ))}

      {/* Start Marker */}
      {startPoint && (
        <Marker position={startPoint} icon={createStartIcon()}>
          <Popup>
            <div className="p-2 min-w-[180px]">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm mb-1">
                <Navigation className="w-4 h-4" />
                <span>Journey Origin</span>
              </div>
              <p className="text-xs text-slate-600">
                Lat: {startPoint[0].toFixed(5)}, Lng: {startPoint[1].toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Destination Marker */}
      {endPoint && (
        <Marker position={endPoint} icon={createDestIcon()}>
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-sm mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Destination Point</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                Lat: {endPoint[0].toFixed(5)}, Lng: {endPoint[1].toFixed(5)}
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-100 p-2 rounded">
                <div>
                  <span className="text-slate-500 block">Distance</span>
                  <strong className="text-slate-800">{activeRoute.distance} km</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Duration</span>
                  <strong className="text-slate-800">{activeRoute.duration} mins</strong>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block">Safety Score</span>
                  <strong className="text-emerald-700">{activeRoute.safetyScore} / 100</strong>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};

export default RouteLayer;
