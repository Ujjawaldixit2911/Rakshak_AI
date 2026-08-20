"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getRoute } from "../utils/mapUtils";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface MapProps {
  start: [number, number];
  destination: [number, number];
}

interface RiskData {
  risk_level: string;
  color: string;
  incident_count: number;
  ai_briefing: string;
}

const Map = ({ start, destination }: MapProps) => {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRouteAndRisk = async () => {
      setLoading(true);
      try {
        // 1. Get Road Route from OSRM
        const routeData = await getRoute(start, destination);
        setRoute(routeData);

        // 2. Send Road Route to Backend Risk Engine
        const response = await fetch("http://localhost:8000/api/analyze-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: routeData }),
        });
        const risk = await response.json();
        setRiskData(risk);

      } catch (error) {
        console.error("Error fetching route or risk data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRouteAndRisk();
  }, [start, destination]);

  return (
    <div className="relative">
      <MapContainer
        center={start}
        zoom={12}
        style={{ height: "500px", width: "100%", borderRadius: "12px", overflow: "hidden" }}
      >
        <TileLayer
          url="https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=7H2SKFCcs98QnCJv2ppb"
          attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={start}><Popup>Start Location</Popup></Marker>
        <Marker position={destination}><Popup>Destination</Popup></Marker>
        
        {route.length > 0 ? (
          <Polyline 
            positions={route} 
            color={riskData?.color || "blue"} 
            weight={6} 
            opacity={0.8} 
          />
        ) : (
          <Polyline positions={[start, destination]} color="gray" dashArray="5, 10" />
        )}
      </MapContainer>

      {/* AI Briefing Overlay */}
      {riskData && !loading && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur p-4 rounded-xl shadow-xl border border-slate-200 text-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <span className={`w-3 h-3 rounded-full bg-${riskData.color}-500`} style={{backgroundColor: riskData.color}}></span>
            <h3 className="font-bold text-lg">AI Safety Briefing - {riskData.risk_level} Risk</h3>
          </div>
          <p className="text-sm text-slate-600 mb-1">
            <strong>{riskData.incident_count}</strong> historical incidents detected near this route.
          </p>
          <p className="text-sm italic border-l-2 border-slate-300 pl-3 mt-2">{riskData.ai_briefing}</p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-[2000] bg-white/50 backdrop-blur flex items-center justify-center rounded-xl">
          <div className="text-lg font-bold text-slate-700 animate-pulse">Analyzing Route Risk...</div>
        </div>
      )}
    </div>
  );
};

export default Map;
