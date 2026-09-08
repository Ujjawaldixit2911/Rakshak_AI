"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SOSButton from "@/components/SOSButton";
import ReportIncidentModal from "@/components/ReportIncidentModal";

// Dynamically import Interactive Leaflet Map to avoid SSR errors
const InteractiveMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="skeleton" style={{ height: 560, borderRadius: 14 }} />
  ),
});

const CITY_OPTIONS = [
  {
    name: "Delhi",
    center: [28.6139, 77.2090] as [number, number],
    zoom: 12,
    presets: [
      { label: "Connaught Place → Saket", start: [28.6315, 77.2167], dest: [28.5245, 77.2066] },
      { label: "Rohini → Hauz Khas", start: [28.7495, 77.0565], dest: [28.5494, 77.2001] },
      { label: "Dwarka → India Gate", start: [28.5921, 77.0460], dest: [28.6129, 77.2295] },
      { label: "Karol Bagh → Lajpat Nagar", start: [28.6514, 77.1907], dest: [28.5700, 77.2373] },
    ]
  },
  {
    name: "Mumbai",
    center: [19.0760, 72.8777] as [number, number],
    zoom: 12,
    presets: [
      { label: "Colaba → Bandra West", start: [18.9067, 72.8147], dest: [19.0596, 72.8295] },
      { label: "Bandra → Powai IIT", start: [19.0596, 72.8295], dest: [19.1176, 72.9060] },
      { label: "Dadar → Andheri East", start: [19.0178, 72.8478], dest: [19.1136, 72.8697] },
      { label: "Juhu → Borivali West", start: [19.1075, 72.8263], dest: [19.2307, 72.8567] },
    ]
  }
];

export default function CitizenSafetyPortal() {
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [safetyMode, setSafetyMode] = useState<"normal" | "night_safety" | "women_safety">("women_safety");
  const [timeOfDay, setTimeOfDay] = useState("Night");

  const [startCoords, setStartCoords] = useState<[number, number]>([28.6315, 77.2167]);
  const [destCoords, setDestCoords] = useState<[number, number]>([28.5245, 77.2066]);

  const [routePlan, setRoutePlan] = useState<any | null>(null);
  const [hotspotsData, setHotspotsData] = useState<any | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[] | null>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showEmergencyPOIs, setShowEmergencyPOIs] = useState(true);

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportCoords, setReportCoords] = useState<{ lat?: number; lon?: number }>({});

  const cityMeta = CITY_OPTIONS.find((c) => c.name === selectedCity) || CITY_OPTIONS[0];

  // Fetch Hotspots and Heatmap for active city on mount or city change
  useEffect(() => {
    const fetchCityData = async () => {
      try {
        const [hsRes, hmRes] = await Promise.all([
          fetch(`http://localhost:8000/api/hotspots?city=${selectedCity}`),
          fetch(`http://localhost:8000/api/safety-heatmap?city=${selectedCity}&grid_size=10`),
        ]);
        const hs = await hsRes.json();
        const hm = await hmRes.json();
        setHotspotsData(hs);
        setHeatmapData(hm.heatmap || []);
      } catch (e) {
        console.error("Failed to load city hotspots/heatmap:", e);
      }
    };
    fetchCityData();

    // Set default preset for city
    const firstPreset = cityMeta.presets[0];
    setStartCoords(firstPreset.start as [number, number]);
    setDestCoords(firstPreset.dest as [number, number]);
  }, [selectedCity]);

  // Request Safe Route
  const handleFindSafeRoute = async () => {
    setLoadingRoute(true);
    try {
      const res = await fetch("http://localhost:8000/api/route/safe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: selectedCity,
          origin: [startCoords[0], startCoords[1]],
          destination: [destCoords[0], destCoords[1]],
          time_of_day: timeOfDay,
          mode: safetyMode,
        }),
      });
      const data = await res.json();
      setRoutePlan(data);
    } catch (e) {
      console.error("Failed to calculate safe route:", e);
    } finally {
      setLoadingRoute(false);
    }
  };

  // Run initial route calculation on load
  useEffect(() => {
    handleFindSafeRoute();
  }, [selectedCity, safetyMode, timeOfDay]);

  return (
    <>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
        {/* ── Header & City Switcher Bar ───────────────────────────────────────── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: "1.5rem"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="badge badge-ai" style={{ fontSize: "0.75rem", padding: "3px 10px" }}>
                🛡️ AI Hotspot & Safe Navigation Platform
              </span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Powered by 5,000 Verified Ride-Safety Records
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 900, letterSpacing: "-0.02em" }}>
              Crime Alert Map · <span style={{ color: "#4f7cff" }}>{selectedCity}</span>
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* City Selector */}
            <div style={{
              display: "flex",
              background: "rgba(30, 41, 59, 0.8)",
              padding: "4px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              {CITY_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setSelectedCity(c.name)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    background: selectedCity === c.name ? "#4f7cff" : "transparent",
                    color: selectedCity === c.name ? "#fff" : "#94a3b8",
                    transition: "all 0.2s"
                  }}
                >
                  📍 {c.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setReportCoords({ lat: startCoords[0], lon: startCoords[1] });
                setIsReportModalOpen(true);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#fca5a5",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              📢 Report Concern
            </button>
          </div>
        </div>

        {/* ── Route Control & Mode Selectors ──────────────────────────────────── */}
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {/* Mode Selector */}
            <div>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                🛡️ Routing Safety Mode
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  { id: "women_safety", label: "👩 Women Safety", desc: "Penalizes harassment records & avoids dark alleys" },
                  { id: "night_safety", label: "🌙 Night Safety", desc: "Favors high-lit & police patrolled avenues" },
                  { id: "normal", label: "⚖️ Balanced", desc: "Fastest path with moderate safety penalty" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSafetyMode(m.id as any)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "8px",
                      border: `1px solid ${safetyMode === m.id ? "#10b981" : "rgba(255,255,255,0.08)"}`,
                      background: safetyMode === m.id ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.03)",
                      color: safetyMode === m.id ? "#34d399" : "#cbd5e1",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time of Day & Presets */}
            <div>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                🕒 Time of Day Simulation
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {["Night", "Evening", "Morning", "Afternoon"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeOfDay(t)}
                    style={{
                      flex: 1,
                      padding: "7px 4px",
                      borderRadius: "8px",
                      border: "none",
                      background: timeOfDay === t ? "#6366f1" : "rgba(255,255,255,0.04)",
                      color: timeOfDay === t ? "#ffffff" : "#94a3b8",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Layer Toggles */}
            <div>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                🗺️ Map Intelligence Layers
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "#cbd5e1", cursor: "pointer" }}>
                  <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
                  🔥 Heatmap
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "#cbd5e1", cursor: "pointer" }}>
                  <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} />
                  📍 Hotspots ({hotspotsData?.total_hotspots || 0})
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "#cbd5e1", cursor: "pointer" }}>
                  <input type="checkbox" checked={showEmergencyPOIs} onChange={(e) => setShowEmergencyPOIs(e.target.checked)} />
                  🚨 Emergency POIs
                </label>
              </div>
            </div>
          </div>

          {/* Quick Route Presets */}
          <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Quick routes in {selectedCity}:</span>
            {cityMeta.presets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setStartCoords(p.start as [number, number]);
                  setDestCoords(p.dest as [number, number]);
                }}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(79, 124, 255, 0.08)",
                  border: "1px solid rgba(79, 124, 255, 0.2)",
                  color: "#93c5fd",
                  fontSize: "0.75rem",
                  cursor: "pointer"
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Interactive Map Component ────────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
          <InteractiveMap
            city={selectedCity}
            center={cityMeta.center}
            zoom={cityMeta.zoom}
            routeData={routePlan}
            hotspotsData={hotspotsData}
            heatmapData={heatmapData}
            showHeatmap={showHeatmap}
            showHotspots={showHotspots}
            showEmergencyPOIs={showEmergencyPOIs}
            onOpenReportModal={(lat, lon) => {
              setReportCoords({ lat, lon });
              setIsReportModalOpen(true);
            }}
          />
        </div>

        {/* ── Route Safety Comparison & AI Trade-off Breakdown ─────────────────── */}
        {routePlan && (
          <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
            {/* AI Safety Explanation Banner */}
            <div className="card" style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "1.25rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: "1.2rem" }}>🤖</span>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#34d399" }}>
                  AI Safe Route Recommendation & Trade-off Analysis
                </h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.6, marginBottom: 12 }}>
                {routePlan.trade_off?.explanation}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div style={{ background: "rgba(16, 185, 129, 0.12)", padding: "10px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#6ee7b7", textTransform: "uppercase", fontWeight: 700 }}>
                    Safest Route Score
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#10b981" }}>
                    {routePlan.safest_route?.average_safety_score} / 100
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                    {routePlan.safest_route?.distance_km} km · {routePlan.safest_route?.estimated_time_minutes} mins
                  </div>
                </div>

                <div style={{ background: "rgba(59, 130, 246, 0.12)", padding: "10px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#93c5fd", textTransform: "uppercase", fontWeight: 700 }}>
                    Fastest Route Score
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#60a5fa" }}>
                    {routePlan.fastest_route?.average_safety_score} / 100
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                    {routePlan.fastest_route?.distance_km} km · {routePlan.fastest_route?.estimated_time_minutes} mins
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency POIs Along Path */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "#f8fafc" }}>
                  🚨 Nearby Emergency Stations
                </h3>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Verified 24x7</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {routePlan.nearby_emergency_pois?.map((poi: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f1f5f9" }}>
                        {poi.type === "police" ? "👮 " : "🏥 "} {poi.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                        📞 {poi.phone}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#38bdf8" }}>
                      {poi.distance_km} km
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Emergency SOS Component */}
      <SOSButton />

      {/* Community Incident Report Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        city={selectedCity}
        initialLat={reportCoords.lat}
        initialLon={reportCoords.lon}
      />
    </>
  );
}
