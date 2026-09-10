"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { LayerControl, LayerVisibilityState } from "./LayerControl";
import { ColorLegend } from "./ColorLegend";
import { RouteLayer } from "./RouteLayer";
import { HotspotLayer, HotspotRecord } from "./HotspotLayer";
import { EmergencyPOILayer, EmergencyPOI } from "./EmergencyPOILayer";
import { CurrentLocationLayer } from "./CurrentLocationLayer";
import { CoordinatePoint, RouteCompareResponse } from "@/lib/routeCompareService";
import { Shield, Sparkles, Navigation, Layers as LayersIcon } from "lucide-react";

// Fix Leaflet's default icon URLs for bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  city?: string;
  source?: CoordinatePoint;
  destination?: CoordinatePoint;
  compareData?: RouteCompareResponse | null;
  selectedRouteType?: "safest" | "fastest" | "balanced";
  onSelectRouteType?: (type: "safest" | "fastest" | "balanced") => void;
  onMapClick?: (lat: number, lng: number) => void;
  initialLayers?: Partial<LayerVisibilityState>;
  height?: string | number;
  className?: string;
}

// Sub-component to manage smooth auto-fitting and panning
function MapViewportManager({
  center,
  zoom,
  routeCoords,
}: {
  center: [number, number];
  zoom: number;
  routeCoords?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      try {
        const bounds = L.latLngBounds(routeCoords.map((c) => [c[0], c[1]]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch (err) {
        console.warn("[MapViewportManager] fitBounds error:", err);
      }
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, routeCoords, map]);

  return null;
}

// Sub-component to capture clicks anywhere on the map
function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  center = [28.6139, 77.209], // New Delhi default
  zoom = 12,
  city = "Delhi",
  source,
  destination,
  compareData,
  selectedRouteType = "safest",
  onSelectRouteType,
  onMapClick,
  initialLayers,
  height = "600px",
  className = "",
}) => {
  // Independent layer visibility state — toggles show/hide without refetching
  const [layers, setLayers] = useState<LayerVisibilityState>({
    routes: initialLayers?.routes ?? true,
    hotspots: initialLayers?.hotspots ?? true,
    pois: initialLayers?.pois ?? true,
    currentLocation: initialLayers?.currentLocation ?? true,
  });

  const [activeRouteOption, setActiveRouteOption] = useState<"safest" | "fastest" | "balanced">(
    selectedRouteType
  );
  const [internalCompareData, setInternalCompareData] = useState<RouteCompareResponse | null>(
    compareData || null
  );

  // Counts tracking for layer badges
  const [hotspotCount, setHotspotCount] = useState<number | undefined>(undefined);
  const [poiCount, setPoiCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (compareData) {
      setInternalCompareData(compareData);
    }
  }, [compareData]);

  useEffect(() => {
    setActiveRouteOption(selectedRouteType);
  }, [selectedRouteType]);

  const handleToggleLayer = useCallback((layerKey: keyof LayerVisibilityState) => {
    setLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  }, []);

  const handleToggleAll = useCallback((enable: boolean) => {
    setLayers({
      routes: enable,
      hotspots: enable,
      pois: enable,
      currentLocation: enable,
    });
  }, []);

  const handleSelectRouteOption = (type: "safest" | "fastest" | "balanced") => {
    setActiveRouteOption(type);
    if (onSelectRouteType) {
      onSelectRouteType(type);
    }
  };

  // Compute active polyline coordinate list for auto-fitting
  const activePolylineCoords = useMemo(() => {
    if (!internalCompareData) return undefined;
    const option = internalCompareData[activeRouteOption];
    if (option && option.geometry && option.geometry.length > 1) {
      return option.geometry.map((pt) => [pt[1], pt[0]] as [number, number]);
    }
    return undefined;
  }, [internalCompareData, activeRouteOption]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 font-sans ${className}`}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
        zoomControl={false}
      >
        {/* Viewport & Click Handlers */}
        <MapViewportManager center={center} zoom={zoom} routeCoords={activePolylineCoords} />
        <MapClickHandler onClick={onMapClick} />

        {/* Base Map Tiles (OSM / Carto Voyager) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>'
        />

        {/* 1. Routes Layer */}
        <RouteLayer
          source={source}
          destination={destination}
          compareData={internalCompareData}
          selectedType={activeRouteOption}
          visible={layers.routes}
          onRouteEvaluated={(res) => setInternalCompareData(res)}
        />

        {/* 2. Hotspots Layer (Lazy-Loaded) */}
        <HotspotLayer
          visible={layers.hotspots}
          onDataLoaded={(records) => setHotspotCount(records.length)}
        />

        {/* 3. Emergency POIs Layer (Lazy-Loaded) */}
        <EmergencyPOILayer
          city={city}
          visible={layers.pois}
          onDataLoaded={(records) => setPoiCount(records.length)}
        />

        {/* 4. Current Location Live Radar Layer */}
        <CurrentLocationLayer visible={layers.currentLocation} />
      </MapContainer>

      {/* Floating Controls Overlay: Top Right (Layer Control & Legend) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-auto">
        <LayerControl
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onToggleAll={handleToggleAll}
          counts={{
            routes: internalCompareData ? 3 : undefined,
            hotspots: hotspotCount,
            pois: poiCount,
          }}
        />

        <ColorLegend collapsible defaultExpanded={false} />
      </div>

      {/* Floating Route Options Bar (Top Center/Left) */}
      {internalCompareData && layers.routes && (
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl pointer-events-auto">
          <button
            type="button"
            onClick={() => handleSelectRouteOption("safest")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeRouteOption === "safest"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Safest Route ({internalCompareData.safest?.safetyScore ?? 85})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRouteOption("fastest")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeRouteOption === "fastest"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Fastest ({internalCompareData.fastest?.duration ?? 20}m)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRouteOption("balanced")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeRouteOption === "balanced"
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Balanced</span>
          </button>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className="absolute bottom-3 left-4 z-[1000] bg-slate-900/80 backdrop-blur-sm border border-slate-700/40 px-3 py-1 rounded-lg text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
        <span>Rakshak AI Live Map Intelligence • {city}</span>
      </div>
    </div>
  );
};

export default MapView;
