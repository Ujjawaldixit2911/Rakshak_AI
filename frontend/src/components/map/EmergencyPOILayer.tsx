"use client";

import React, { useEffect, useState, useRef } from "react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Phone, Shield, HeartPulse, Building2, ExternalLink } from "lucide-react";

export interface EmergencyPOI {
  id: string;
  name: string;
  type: "police" | "hospital" | string;
  lat: number;
  lng: number;
  phone: string;
  city: string;
  is24x7?: boolean;
}

export interface EmergencyPOILayerProps {
  visible?: boolean;
  city?: string;
  onDataLoaded?: (pois: EmergencyPOI[]) => void;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

// High-visibility Custom HTML DivIcons for Police Stations and Hospitals
const createPoliceIcon = () =>
  L.divIcon({
    className: "custom-emergency-icon police-icon",
    html: `
      <div style="
        width: 34px; height: 34px; border-radius: 8px;
        background: linear-gradient(135deg, #1e3a8a, #3b82f6);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 14px rgba(30, 58, 138, 0.6);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; color: white;
      ">
        👮
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

const createHospitalIcon = () =>
  L.divIcon({
    className: "custom-emergency-icon hospital-icon",
    html: `
      <div style="
        width: 34px; height: 34px; border-radius: 8px;
        background: linear-gradient(135deg, #047857, #10b981);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.6);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; color: white;
      ">
        🏥
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

// Reliable Fallback Emergency POIs for demo / offline operation
const FALLBACK_POIS: EmergencyPOI[] = [
  { id: "p1", name: "Connaught Place Police Station", type: "police", lat: 28.6328, lng: 77.2195, phone: "011-23340555", city: "Delhi", is24x7: true },
  { id: "p2", name: "Hauz Khas Police Station", type: "police", lat: 28.5482, lng: 77.2024, phone: "011-26510093", city: "Delhi", is24x7: true },
  { id: "p3", name: "Rohini North Police Station", type: "police", lat: 28.7510, lng: 77.0600, phone: "011-27551000", city: "Delhi", is24x7: true },
  { id: "p4", name: "Saket Police Station", type: "police", lat: 28.5220, lng: 77.2100, phone: "011-29561000", city: "Delhi", is24x7: true },
  { id: "h1", name: "AIIMS Apex Trauma Center", type: "hospital", lat: 28.5672, lng: 77.2100, phone: "011-26588500", city: "Delhi", is24x7: true },
  { id: "h2", name: "Safdarjung Hospital 24x7 Emergency", type: "hospital", lat: 28.5705, lng: 77.2078, phone: "011-26165060", city: "Delhi", is24x7: true },
  { id: "h3", name: "Max Super Speciality Hospital Saket", type: "hospital", lat: 28.5273, lng: 77.2140, phone: "011-26515050", city: "Delhi", is24x7: true },
  { id: "h4", name: "Sir Ganga Ram Hospital", type: "hospital", lat: 28.6385, lng: 77.1895, phone: "011-25750000", city: "Delhi", is24x7: true },
];

export const EmergencyPOILayer: React.FC<EmergencyPOILayerProps> = ({
  visible = true,
  city,
  onDataLoaded,
}) => {
  const [pois, setPois] = useState<EmergencyPOI[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Lazy-load: Fetch only when layer is first enabled
  useEffect(() => {
    if (!visible || hasFetched || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    const url = city
      ? `${API_BASE}/api/emergency/pois?city=${encodeURIComponent(city)}`
      : `${API_BASE}/api/emergency/pois`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Emergency POI API status ${res.status}`);
        }
        const data = await res.json();
        const records: EmergencyPOI[] = Array.isArray(data) ? data : FALLBACK_POIS;
        setPois(records);
        setHasFetched(true);
        if (onDataLoaded) onDataLoaded(records);
      })
      .catch((err) => {
        console.warn("[EmergencyPOILayer] Using fallback POIs:", err);
        setPois(FALLBACK_POIS);
        setHasFetched(true);
        if (onDataLoaded) onDataLoaded(FALLBACK_POIS);
      })
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  }, [visible, hasFetched, city, onDataLoaded]);

  // Keep state in memory but toggle off map rendering
  if (!visible) {
    return null;
  }

  return (
    <>
      {pois.map((poi) => {
        const isPolice = poi.type.toLowerCase() === "police";
        const icon = isPolice ? createPoliceIcon() : createHospitalIcon();

        return (
          <Marker
            key={`poi-${poi.id || poi.name}-${poi.lat}-${poi.lng}`}
            position={[poi.lat, poi.lng]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -18]}>
              <div className="text-xs font-semibold">
                {isPolice ? "👮 Police Station" : "🏥 24x7 Hospital"}
                <div className="text-[11px] font-normal text-slate-600">{poi.name}</div>
              </div>
            </Tooltip>

            <Popup>
              <div className="p-2 min-w-[220px] text-slate-900">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs ${
                      isPolice ? "bg-blue-600" : "bg-emerald-600"
                    }`}
                  >
                    {isPolice ? <Shield className="w-4 h-4" /> : <HeartPulse className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                      {poi.name}
                    </h4>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                        isPolice
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {isPolice ? "POLICE COMMAND STATION" : "24/7 EMERGENCY TRAUMA"}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Status:</span>
                    <span className="font-bold text-emerald-600">● 24x7 Active Dispatch</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Direct Helpline:</span>
                    <strong className="font-mono text-slate-900">{poi.phone}</strong>
                  </div>

                  {/* Direct Call Button */}
                  <a
                    href={`tel:${poi.phone}`}
                    className={`flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-white font-semibold text-xs transition-colors shadow-sm ${
                      isPolice
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Facility Now</span>
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default EmergencyPOILayer;
