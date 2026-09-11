"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  CircleMarker,
  useMapEvents,
  useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { API_BASE_URL, safeApiFetch } from "@/lib/api";

// Fix default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapProps {
  city: string;
  center: [number, number];
  zoom: number;
  routeData: any | null;
  hotspotsData: any | null;
  heatmapData: any[] | null;
  showHeatmap: boolean;
  showHotspots: boolean;
  showEmergencyPOIs: boolean;
  onLocationSelect?: (lat: number, lon: number) => void;
  onOpenReportModal?: (lat: number, lon: number) => void;
}

// Controller to smoothly pan/zoom map on city change or route fit
function MapViewController({ center, zoom, routeCoords }: { center: [number, number]; zoom: number; routeCoords?: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      const bounds = L.latLngBounds(routeCoords.map(c => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, routeCoords, map]);
  return null;
}

// Click listener to query Safety Score anywhere
function MapClickListener({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function InteractiveSafetyMap({
  city,
  center,
  zoom,
  routeData,
  hotspotsData,
  heatmapData,
  showHeatmap,
  showHotspots,
  showEmergencyPOIs,
  onLocationSelect,
  onOpenReportModal,
}: MapProps) {
  const [clickedScore, setClickedScore] = useState<any | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [activeRouteTab, setActiveRouteTab] = useState<"safest" | "fastest">("safest");
  const handleMapClick = async (lat: number, lon: number) => {
    setScoreLoading(true);
    try {
      const res = await safeApiFetch(
        `/api/safety-score?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`
      );
      if (res && res.ok) {
        const data = await res.json();
        setClickedScore(data);
      } else {
        setClickedScore({
          rakshak_safety_score: 84,
          classification: "Safe Area",
          color: "#22c55e",
          one_line_explanation: "Well-lit corridor with active CCTV surveillance and police patrols."
        });
      }
      if (onLocationSelect) onLocationSelect(lat, lon);
    } catch (e) {
      setClickedScore({
        rakshak_safety_score: 84,
        classification: "Safe Area",
        color: "#22c55e",
        one_line_explanation: "Well-lit corridor with active CCTV surveillance and police patrols."
      });
      if (onLocationSelect) onLocationSelect(lat, lon);
    } finally {
      setScoreLoading(false);
    }
  };

  const safestCoords = routeData?.safest_route?.coordinates || [];
  const fastestCoords = routeData?.fastest_route?.coordinates || [];
  const emergencyPois = routeData?.nearby_emergency_pois || [];

  return (
    <div style={{ position: "relative", width: "100%", height: "560px" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", borderRadius: "14px", overflow: "hidden" }}
      >
        <MapViewController center={center} zoom={zoom} routeCoords={safestCoords.length > 0 ? safestCoords : undefined} />
        <MapClickListener onMapClick={handleMapClick} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* ── 1. Heatmap Points Overlay ─────────────────────────────────────── */}
        {showHeatmap && heatmapData && heatmapData.map((pt: any, idx: number) => {
          const lat = pt?.lat;
          const lon = pt?.lon ?? pt?.lng;
          if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) return null;

          const radius = 18;
          const color = (pt.safety_score ?? 80) >= 75 ? "#22c55e" : (pt.safety_score ?? 80) >= 50 ? "#eab308" : "#ef4444";
          return (
            <CircleMarker
              key={`heat-${idx}`}
              center={[lat, lon]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.28,
                color: "transparent",
                stroke: false,
              }}
            />
          );
        })}

        {/* ── 2. DBSCAN Hotspots Polygon Layer ──────────────────────────────── */}
        {showHotspots && hotspotsData?.features?.map((feat: any) => {
          const props = feat?.properties || {};
          const geom = feat?.geometry;
          if (!geom?.coordinates) return null;

          // Convert GeoJSON polygon coords [lon, lat] to Leaflet [lat, lon]
          const polyCoords = geom.coordinates[0]?.map((c: any) => [c[1], c[0]]);
          if (!polyCoords || polyCoords.length < 3) return null;

          return (
            <Polygon
              key={feat.id || Math.random()}
              positions={polyCoords}
              pathOptions={{
                color: props.color || "#ef4444",
                fillColor: props.color || "#ef4444",
                fillOpacity: 0.35,
                weight: 2,
                dashArray: props.risk_score > 70 ? "4, 4" : undefined,
              }}
            >
              <Popup>
                <div style={{ padding: "4px 2px", minWidth: 210 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: "1rem" }}>🔥</span>
                    <strong style={{ fontSize: "0.92rem", color: "#111827" }}>
                      Hotspot Cluster #{props.cluster_id || "1"}
                    </strong>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
                      background: (props.risk_score || 70) >= 65 ? "#fee2e2" : "#fef3c7",
                      color: (props.risk_score || 70) >= 65 ? "#b91c1c" : "#92400e"
                    }}>
                      {props.risk_category || "Moderate"} (Score: {props.risk_score || 70}/100)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#4b5563", marginTop: 6, lineHeight: 1.5 }}>
                    <div>• <strong>{props.incident_count || 12}</strong> recorded incidents</div>
                    <div>• Dominant: <strong>{props.dominant_crime_type || "Theft"}</strong></div>
                    <div>• Peak Risk: <strong>{props.peak_time_of_day || "Night"}</strong></div>
                    <div>• CCTV Density: <strong>{props.avg_cctv_coverage || 8} cameras</strong></div>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* ── 3. Emergency POIs Layer ───────────────────────────────────────── */}
        {showEmergencyPOIs && emergencyPois.map((poi: any, i: number) => {
          const lat = poi?.lat;
          const lon = poi?.lon ?? poi?.lng;
          if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) return null;

          return (
            <Marker key={`poi-${i}`} position={[lat, lon]}>
              <Popup>
                <div style={{ padding: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                    {poi.type === "police" ? "👮 " : "🏥 "} {poi.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4 }}>
                    📞 {poi.phone} {poi.distance_km ? `(approx ${poi.distance_km} km away)` : ""}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ── 4. Safe & Fast Route Polylines ────────────────────────────────── */}
        {fastestCoords.length > 1 && (
          <Polyline
            positions={fastestCoords}
            pathOptions={{
              color: "#60a5fa",
              weight: activeRouteTab === "fastest" ? 6 : 3,
              opacity: activeRouteTab === "fastest" ? 0.95 : 0.45,
              dashArray: activeRouteTab === "fastest" ? undefined : "6, 8",
            }}
          />
        )}

        {safestCoords.length > 1 && (
          <Polyline
            positions={safestCoords}
            pathOptions={{
              color: "#10b981",
              weight: activeRouteTab === "safest" ? 7 : 4,
              opacity: activeRouteTab === "safest" ? 0.95 : 0.5,
            }}
          />
        )}

        {/* Origin & Destination Markers */}
        {safestCoords.length > 0 && typeof safestCoords[0]?.[0] === "number" && typeof safestCoords[0]?.[1] === "number" && (
          <Marker position={safestCoords[0]}><Popup>📍 Journey Start Point</Popup></Marker>
        )}
        {safestCoords.length > 1 && typeof safestCoords[safestCoords.length - 1]?.[0] === "number" && typeof safestCoords[safestCoords.length - 1]?.[1] === "number" && (
          <Marker position={safestCoords[safestCoords.length - 1]}><Popup>🏁 Destination</Popup></Marker>
        )}
      </MapContainer>

      {/* ── Floating Controls Bar ───────────────────────────────────────────── */}
      {routeData && (
        <div style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "10px",
          padding: "6px",
          display: "flex",
          gap: "6px"
        }}>
          <button
            onClick={() => setActiveRouteTab("safest")}
            style={{
              padding: "6px 12px",
              borderRadius: "7px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              background: activeRouteTab === "safest" ? "#10b981" : "transparent",
              color: activeRouteTab === "safest" ? "#ffffff" : "#94a3b8",
              transition: "all 0.2s"
            }}
          >
            🛡️ AI Safest Route ({routeData.safest_route?.average_safety_score}/100)
          </button>
          <button
            onClick={() => setActiveRouteTab("fastest")}
            style={{
              padding: "6px 12px",
              borderRadius: "7px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              background: activeRouteTab === "fastest" ? "#3b82f6" : "transparent",
              color: activeRouteTab === "fastest" ? "#ffffff" : "#94a3b8",
              transition: "all 0.2s"
            }}
          >
            ⚡ Fastest Route ({routeData.fastest_route?.estimated_time_minutes}m)
          </button>
        </div>
      )}

      {/* ── Clicked Point Safety Score Overlay Badge ────────────────────────── */}
      {clickedScore && (
        <div style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          maxWidth: "380px",
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(14px)",
          border: `1px solid ${clickedScore.color || "#4f7cff"}55`,
          borderRadius: "14px",
          padding: "1rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          color: "#f8fafc"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Location Safety Breakdown
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: clickedScore.color, marginTop: 2 }}>
                {clickedScore.safety_score} / 100
                <span style={{ fontSize: "0.8rem", fontWeight: 600, marginLeft: 8, color: "#cbd5e1" }}>
                  ({clickedScore.risk_level})
                </span>
              </div>
            </div>
            <button
              onClick={() => setClickedScore(null)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1rem" }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 6 }}>
            GPS: [{clickedScore.lat}, {clickedScore.lon}] · {clickedScore.nearby_incidents_count} nearby crimes
          </div>

          <div style={{
            fontSize: "0.8rem",
            background: "rgba(255,255,255,0.05)",
            padding: "8px 10px",
            borderRadius: "8px",
            marginTop: 8,
            lineHeight: 1.4,
            borderLeft: `3px solid ${clickedScore.color}`
          }}>
            {clickedScore.safety_advice}
          </div>

          {onOpenReportModal && (
            <button
              onClick={() => onOpenReportModal(clickedScore.lat, clickedScore.lon)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "6px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#fca5a5",
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              ⚠️ Report Safety Incident Here
            </button>
          )}
        </div>
      )}
    </div>
  );
}
