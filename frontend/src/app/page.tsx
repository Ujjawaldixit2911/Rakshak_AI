"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SOSButton from "@/components/SOSButton";
import ReportIncidentModal from "@/components/ReportIncidentModal";
import RakshakAICopilot from "@/components/RakshakAICopilot";
import VoiceInputButton from "@/components/VoiceInputButton";
import { API_BASE_URL } from "@/lib/api";

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
      { label: "Noida Sec 18 → CP", start: [28.5708, 77.3261], dest: [28.6315, 77.2167] },
    ],
  },
  {
    name: "Mumbai",
    center: [19.0760, 72.8777] as [number, number],
    zoom: 12,
    presets: [
      { label: "Andheri → Bandra", start: [19.1136, 72.8697], dest: [19.0596, 72.8295] },
      { label: "Colaba → Dadar", start: [18.9067, 72.8147], dest: [19.0178, 72.8478] },
      { label: "Powai → BKC", start: [19.1176, 72.9060], dest: [19.0664, 72.8677] },
    ],
  },
  {
    name: "Bengaluru",
    center: [12.9716, 77.5946] as [number, number],
    zoom: 12,
    presets: [
      { label: "Indiranagar → Koramangala", start: [12.9784, 77.6408], dest: [12.9352, 77.6245] },
      { label: "Whitefield → MG Road", start: [12.9698, 77.7500], dest: [12.9756, 77.6066] },
      { label: "Electronic City → HSR", start: [12.8399, 77.6770], dest: [12.9121, 77.6446] },
    ],
  },
];

export default function CitizenPortal() {
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [startCoords, setStartCoords] = useState<[number, number]>([28.6315, 77.2167]);
  const [destCoords, setDestCoords] = useState<[number, number]>([28.5245, 77.2066]);
  const [safetyMode, setSafetyMode] = useState<"safest" | "balanced" | "fastest">("safest");
  const [timeOfDay, setTimeOfDay] = useState("22:00");

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
          fetch(`${API_BASE_URL}/api/hotspots?city=${selectedCity}`),
          fetch(`${API_BASE_URL}/api/safety-heatmap?city=${selectedCity}&grid_size=10`),
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
      const res = await fetch(`${API_BASE_URL}/api/route/safe`, {
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

  // AI Copilot Route Dispatcher
  const handleApplyAIRoute = (
    origin: [number, number],
    dest: [number, number],
    originName: string,
    destName: string
  ) => {
    setStartCoords(origin);
    setDestCoords(dest);
    // Find safe route with new coordinates
    const computeAIRoute = async () => {
      setLoadingRoute(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/route/safe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: selectedCity,
            origin: [origin[0], origin[1]],
            destination: [dest[0], dest[1]],
            time_of_day: timeOfDay,
            mode: safetyMode,
          }),
        });
        const data = await res.json();
        setRoutePlan(data);
      } catch (e) {
        console.error("Failed to compute AI route:", e);
      } finally {
        setLoadingRoute(false);
      }
    };
    computeAIRoute();
  };

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
                Live Crime Density · DBSCAN Spatial Clusters · Dijkstra Penalty Routing
              </span>
            </div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
              Citizen Safety Portal & Safe Route Navigator
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "flex",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "3px"
            }}>
              {CITY_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setSelectedCity(c.name)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "9px",
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

          {/* Quick Route Presets & Voice Command Bar */}
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

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>🎙️ Speak route:</span>
              <VoiceInputButton
                size="sm"
                title="Speak to plan safe route (e.g. 'CP se Saket')"
                onResult={(text) => {
                  const el = document.getElementById("rakshak-copilot-launcher");
                  if (el) el.click();
                }}
              />
            </div>
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
              <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 12px 0" }}>
                {routePlan.safety_explanation}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.78rem", background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>
                  🛡️ Risk Reduction: {routePlan.trade_off?.safety_benefit_pct || "84"}% Lower Crime Exposure
                </span>
                <span style={{ fontSize: "0.78rem", background: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>
                  ⏱️ Trade-off: +{routePlan.trade_off?.time_overhead_mins || 2.5} mins detour for verified safety
                </span>
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

      {/* Floating Rakshak AI Voice Copilot & Route Traverser */}
      <RakshakAICopilot
        city={selectedCity}
        routeData={routePlan}
        onApplyRoute={handleApplyAIRoute}
        onSelectCity={(c) => setSelectedCity(c)}
        onTriggerSOS={() => {
          const sosBtn = document.getElementById("sos-button");
          if (sosBtn) sosBtn.click();
        }}
        onOpenReport={(lat, lon) => {
          setReportCoords({ lat: lat || startCoords[0], lon: lon || startCoords[1] });
          setIsReportModalOpen(true);
        }}
      />
    </>
  );
}
