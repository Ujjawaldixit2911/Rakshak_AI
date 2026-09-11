"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SOSButton from "@/components/SOSButton";
import ReportIncidentModal from "@/components/ReportIncidentModal";
import RakshakAICopilot from "@/components/RakshakAICopilot";
import VoiceInputButton from "@/components/VoiceInputButton";
import WhatIfSimulator from "@/components/public/WhatIfSimulator";
import LastMileSafetyCard from "@/components/public/LastMileSafetyCard";
import FamilySafetyModal from "@/components/FamilySafetyModal";
import VoiceAgentModal from "@/components/VoiceAgentModal";
import WhatIfSimulatorModal from "@/components/WhatIfSimulatorModal";
import { JourneyLifecycleController } from "@/components/JourneyLifecycleController";
import { PlatformHealthDrawer } from "@/components/PlatformHealthDrawer";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import GoogleAuthGateway from "@/components/auth/GoogleAuthGateway";
import RouteNavigationGuidance from "@/components/route/RouteNavigationGuidance";
import HeroAvatarPresenter from "@/components/HeroAvatarPresenter";
import EmergencyHubModal from "@/components/EmergencyHubModal";

// Dynamically import Interactive Leaflet Map to avoid SSR errors
const InteractiveMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="skeleton" style={{ height: 560, borderRadius: 24 }} />
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
      { label: "Bandra → BKC", start: [19.0596, 72.8295], dest: [19.0657, 72.8687] },
      { label: "Andheri → Juhu", start: [19.1197, 72.8464], dest: [19.1075, 72.8263] },
      { label: "Colaba → Nariman Point", start: [18.9067, 72.8147], dest: [18.9256, 72.8242] },
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
  const { isAuthenticated, isLoading, user, currentFieldInfo, openFieldModal } = useAuth();

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
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isVoiceAgentModalOpen, setIsVoiceAgentModalOpen] = useState(false);
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyTab, setEmergencyTab] = useState<"ambulance" | "police" | "sos">("sos");
  const [reportCoords, setReportCoords] = useState<{ lat?: number; lon?: number }>({});

  const openEmergencyHub = (tab: "ambulance" | "police" | "sos" = "sos") => {
    setEmergencyTab(tab);
    setIsEmergencyModalOpen(true);
  };

  const cityMeta = CITY_OPTIONS.find((c) => c.name === selectedCity) || CITY_OPTIONS[0];

  // Fetch Hotspots and Heatmap for active city on mount or city change
  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [selectedCity, isAuthenticated]);

  // Request Safe Route
  const handleFindSafeRoute = async () => {
    if (!isAuthenticated) return;
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
    if (isAuthenticated) {
      handleFindSafeRoute();
    }
  }, [selectedCity, safetyMode, timeOfDay, isAuthenticated]);

  // AI Copilot Route Dispatcher
  const handleApplyAIRoute = (
    origin: [number, number],
    dest: [number, number],
    originName: string,
    destName: string
  ) => {
    setStartCoords(origin);
    setDestCoords(dest);
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

  // Scroll to section helper
  const scrollToMap = () => {
    const el = document.getElementById("safety-map-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const openCopilot = () => {
    const el = document.getElementById("rakshak-copilot-launcher");
    if (el) el.click();
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48,
            height: 48,
            border: "3px solid rgba(79, 124, 255, 0.2)",
            borderTopColor: "#4f7cff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 600 }}>
            Verifying Authentication & Field Profile...
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated -> Show Google Sign-in & Field selection gateway
  if (!isAuthenticated || !user) {
    return <GoogleAuthGateway />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a" }}>
      {/* ── 1. ACTIVE USER & FIELD STATUS BAR ───────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "1rem 1.5rem 0" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 18px",
          background: currentFieldInfo.bgGlow,
          border: `1px solid ${currentFieldInfo.color}33`,
          borderRadius: 20,
          marginBottom: "1rem",
          boxShadow: `0 4px 25px ${currentFieldInfo.bgGlow}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${currentFieldInfo.color}` }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#f8fafc" }}>
                  Active Session: {user.name}
                </span>
                <span style={{
                  fontSize: "0.68rem",
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontWeight: 700,
                }}>
                  {currentFieldInfo.icon} {currentFieldInfo.title}
                </span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>
                🎯 <strong>Active Purpose:</strong> {currentFieldInfo.tagline}
              </div>
            </div>
          </div>

          <button
            onClick={openFieldModal}
            style={{
              padding: "5px 12px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#e2e8f0",
              fontSize: "0.76rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🔄 Switch Profile Focus
          </button>
        </div>
      </div>

      {/* ── 2. CARESYNC-STYLE PRESENTATION HERO SECTION ──────────────────────── */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1.5rem" }}>
        <section style={{
          textAlign: "center",
          padding: "2rem 1rem 3rem",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Ambient Glow */}
          <div style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "650px",
            height: "350px",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(99, 102, 241, 0.12) 40%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            zIndex: 0,
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Top Announcement Pill */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: "9999px",
              background: "rgba(30, 41, 59, 0.7)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              backdropFilter: "blur(12px)",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#e2e8f0",
              marginBottom: "1.5rem",
              boxShadow: "0 0 20px rgba(56, 189, 248, 0.2)",
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#38bdf8",
                boxShadow: "0 0 8px #38bdf8",
                animation: "pulse 1.2s infinite",
              }} />
              <span>🛡️ Rakshak AI 2.0 • India's First Real-Time AI Safety & Smart Navigation Platform</span>
            </div>

            {/* Apple / CareSync Style Bold Headline */}
            <h1 style={{
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              color: "#f8fafc",
              maxWidth: 900,
              margin: "0 auto 1.25rem",
            }}>
              Navigate Smart.<br />
              <span style={{
                background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Stay Safe Everywhere.
              </span>
            </h1>

            {/* Sub-headline */}
            <p style={{
              fontSize: "1.1rem",
              color: "#94a3b8",
              maxWidth: 720,
              margin: "0 auto 2rem",
              lineHeight: 1.6,
            }}>
              Autonomous crime spatial clustering, Dijkstra penalty avoidance routing, and instant 24x7 emergency response orchestration across 36 Indian States & UTs.
            </p>

            {/* Focused Core Action Buttons */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: "2.5rem",
            }}>
              {/* Feature 1: Safe Routing Launch */}
              <button
                onClick={scrollToMap}
                style={{
                  padding: "13px 26px",
                  borderRadius: "9999px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "#fff",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 8px 25px rgba(59, 130, 246, 0.45)",
                  transition: "all 0.2s ease",
                }}
              >
                <span>🗺️ Launch Safe Navigation</span>
                <span style={{ fontSize: "1.1rem" }}>→</span>
              </button>

              {/* Feature 2: AI Voice Copilot */}
              <button
                onClick={openCopilot}
                style={{
                  padding: "13px 24px",
                  borderRadius: "9999px",
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)",
                  border: "1px solid rgba(168, 85, 247, 0.45)",
                  color: "#e9d5ff",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 20px rgba(168, 85, 247, 0.25)",
                }}
              >
                <span>🤖 Open AI Copilot</span>
              </button>

              {/* Feature 3: Emergency Action Hub */}
              <button
                onClick={() => openEmergencyHub("sos")}
                style={{
                  padding: "13px 24px",
                  borderRadius: "9999px",
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.28) 0%, rgba(220, 38, 38, 0.45) 100%)",
                  border: "1px solid rgba(239, 68, 68, 0.6)",
                  color: "#fca5a5",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 20px rgba(239, 68, 68, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                <span>🚨 Emergency Hub (🚑 👮 🚨)</span>
              </button>

              {/* Feature 4: Avatar Presenter Stage */}
              <button
                onClick={() => {
                  const el = document.getElementById("hero-presenter-stage");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  padding: "13px 22px",
                  borderRadius: "9999px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#f1f5f9",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🎙️ Meet AI Presenter</span>
              </button>
            </div>

            {/* Trust & Telemetry metric ribbon */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 20,
              padding: "12px 24px",
              borderRadius: "9999px",
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              maxWidth: 880,
              margin: "0 auto",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#cbd5e1" }}>
                <span style={{ color: "#10b981", fontWeight: 800 }}>🛡️ 99.4%</span> Corridor Safety Index
              </div>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#cbd5e1" }}>
                <span style={{ color: "#38bdf8", fontWeight: 800 }}>🗺️ 780+</span> Districts Mapped
              </div>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#cbd5e1" }}>
                <span style={{ color: "#f59e0b", fontWeight: 800 }}>🚓 24x7</span> Verified PCR Patrol
              </div>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#cbd5e1" }}>
                <span style={{ color: "#a855f7", fontWeight: 800 }}>⚡ 0.4s</span> AI Optimization
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. AI PRESENTER HERO STAGE ────────────────────────────────────────── */}
        <div id="hero-presenter-stage" style={{ marginBottom: "3.5rem" }}>
          <HeroAvatarPresenter
            onExploreMap={scrollToMap}
            onOpenCopilot={openCopilot}
          />
        </div>

        {/* ── 4. 4-PILLAR CORE SAFETY ARCHITECTURE (EACH CARD WITH ITS SPECIFIC BUTTON) ─ */}
        <section id="four-pillars-section" style={{ marginBottom: "3.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span style={{
              fontSize: "0.76rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#38bdf8",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}>
              NEXT-GEN SAFETY ENGINE
            </span>
            <h2 style={{
              fontSize: "2rem",
              fontWeight: 900,
              color: "#f8fafc",
              letterSpacing: "-0.03em",
              margin: "10px 0 6px 0",
            }}>
              4-Pillar Autonomous Intelligence Stack
            </h2>
            <p style={{ fontSize: "0.95rem", color: "#94a3b8", maxWidth: 640, margin: "0 auto" }}>
              Explore the four core modules powering Rakshak AI's threat neutralization architecture.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}>
            {/* Pillar 1: Spatial AI */}
            <div style={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(244, 63, 94, 0.25)",
              borderRadius: "24px",
              padding: "1.75rem",
              boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "16px",
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  marginBottom: "1rem",
                }}>
                  📍
                </div>
                <div style={{ fontSize: "0.72rem", color: "#fb7185", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  SPATIAL AI
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
                  DBSCAN Hotspot Clustering
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
                  Groups historical FIRs, harassment alerts, and crowd reports into continuous dynamic risk clusters.
                </p>
              </div>

              {/* Specific Action Button for Spatial AI */}
              <button
                onClick={() => {
                  setShowHeatmap(true);
                  setShowHotspots(true);
                  scrollToMap();
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(225, 29, 72, 0.25) 100%)",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  color: "#fecdd3",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <span>🔥 View Live Crime Heatmap</span>
              </button>
            </div>

            {/* Pillar 2: Algorithmic Routing Engine */}
            <div style={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "24px",
              padding: "1.75rem",
              boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "16px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  marginBottom: "1rem",
                }}>
                  🛣️
                </div>
                <div style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  ALGORITHMIC ENGINE
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
                  Multi-Criteria Dijkstra Routing
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
                  Penalizes unlit paths and high-crime sectors, prioritizing illuminated avenues with CCTV surveillance.
                </p>
              </div>

              {/* Specific Action Button for Routing Engine */}
              <button
                onClick={() => {
                  setSafetyMode("safest");
                  scrollToMap();
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.25) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  color: "#a7f3d0",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <span>🗺️ Calculate Safest Corridor</span>
              </button>
            </div>

            {/* Pillar 3: Civic Infrastructure & SOS */}
            <div style={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "24px",
              padding: "1.75rem",
              boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "16px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  marginBottom: "1rem",
                }}>
                  🚨
                </div>
                <div style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  CIVIC & EMERGENCY NETWORK
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
                  24x7 Verified POI Corridors
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
                  Seamless integration with geocoded police stations, pink booths, PCR vans, and emergency 112 dispatch.
                </p>
              </div>

              {/* Specific Action Button for Civic/Emergency */}
              <button
                onClick={() => {
                  setReportCoords({ lat: startCoords[0], lon: startCoords[1] });
                  setIsReportModalOpen(true);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.25) 100%)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#fecaca",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <span>📢 Report Concern / Hazard Pin</span>
              </button>
            </div>

            {/* Pillar 4: Conversational AI Copilot */}
            <div style={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              borderRadius: "24px",
              padding: "1.75rem",
              boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "16px",
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  marginBottom: "1rem",
                }}>
                  🎙️
                </div>
                <div style={{ fontSize: "0.72rem", color: "#c084fc", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  CONVERSATIONAL AI
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
                  Multilingual Voice Copilot
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
                  Hands-free natural Hindi & English voice assistant for instant route computation, hazard reporting & SOS.
                </p>
              </div>

              {/* Specific Action Button for Voice Copilot */}
              <button
                onClick={openCopilot}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(126, 34, 206, 0.25) 100%)",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  color: "#f3e8ff",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <span>🤖 Chat with AI Voice Copilot</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 5. INTERACTIVE LIVE SAFE NAVIGATION CONSOLE ───────────────────────── */}
        <div id="safety-map-section" style={{
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 24, 41, 1) 100%)",
          border: "1px solid rgba(79, 124, 255, 0.3)",
          borderRadius: "28px",
          padding: "1.75rem",
          marginBottom: "2.5rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        }}>
          {/* Header & City Switcher Bar */}
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
                <span style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}>
                  🛡️ AI Hotspot & Safe Navigation Platform
                </span>
                <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                  Live Crime Density · DBSCAN Spatial Clusters · Dijkstra Penalty Routing
                </span>
              </div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 900, margin: 0, letterSpacing: "-0.03em", color: "#f8fafc" }}>
                Citizen Safety Portal & Safe Route Navigator
              </h2>
            </div>

            {/* City Selector Tabs */}
            <div style={{
              display: "flex",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "9999px",
              padding: "3px"
            }}>
              {CITY_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setSelectedCity(c.name)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "9999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    background: selectedCity === c.name ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "transparent",
                    color: selectedCity === c.name ? "#fff" : "#94a3b8",
                    boxShadow: selectedCity === c.name ? "0 2px 10px rgba(59,130,246,0.4)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  📍 {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Route Control & Mode Selectors */}
          <div style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "1.25rem",
            marginBottom: "1.5rem"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {/* Feature Mode Selector (Purpose-built button styling) */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  🛡️ Routing Safety Mode
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {/* Safest / Women Safety Button */}
                  <button
                    onClick={() => setSafetyMode("safest")}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "12px",
                      border: `1px solid ${safetyMode === "safest" ? "#ec4899" : "rgba(255,255,255,0.08)"}`,
                      background: safetyMode === "safest" ? "rgba(236, 72, 153, 0.15)" : "rgba(255,255,255,0.03)",
                      color: safetyMode === "safest" ? "#f472b6" : "#cbd5e1",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s ease"
                    }}
                  >
                    🛡️ Safest / Women
                  </button>

                  {/* Balanced Corridor Button */}
                  <button
                    onClick={() => setSafetyMode("balanced")}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "12px",
                      border: `1px solid ${safetyMode === "balanced" ? "#10b981" : "rgba(255,255,255,0.08)"}`,
                      background: safetyMode === "balanced" ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.03)",
                      color: safetyMode === "balanced" ? "#34d399" : "#cbd5e1",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s ease"
                    }}
                  >
                    ⚖️ Balanced
                  </button>

                  {/* Fastest / Night Transit Button */}
                  <button
                    onClick={() => setSafetyMode("fastest")}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "12px",
                      border: `1px solid ${safetyMode === "fastest" ? "#818cf8" : "rgba(255,255,255,0.08)"}`,
                      background: safetyMode === "fastest" ? "rgba(99, 102, 241, 0.15)" : "rgba(255,255,255,0.03)",
                      color: safetyMode === "fastest" ? "#a5b4fc" : "#cbd5e1",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s ease"
                    }}
                  >
                    ⚡ Fastest / Night
                  </button>
                </div>
              </div>

              {/* Time of Day Simulation */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
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
                        borderRadius: "10px",
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
                <label style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  🗺️ Map Intelligence Layers
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
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
              <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700 }}>Quick routes in {selectedCity}:</span>
              {cityMeta.presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setStartCoords(p.start as [number, number]);
                    setDestCoords(p.dest as [number, number]);
                  }}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "9999px",
                    background: "rgba(79, 124, 255, 0.1)",
                    border: "1px solid rgba(79, 124, 255, 0.25)",
                    color: "#93c5fd",
                    fontSize: "0.75rem",
                    fontWeight: 600,
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

          {/* Interactive Map */}
          <div style={{ borderRadius: "24px", overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.1)" }}>
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

          {/* Route Safety Comparison & Trade-off Breakdown */}
          {routePlan && (
            <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {/* AI Safety Explanation Banner */}
              <div style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderRadius: "20px",
                padding: "1.25rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.2rem" }}>🛡️</span>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#34d399", margin: 0 }}>
                    Rakshak Safety Score & Route Trade-Off
                  </h3>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 12px 0" }}>
                  {routePlan.safety_explanation}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.78rem", background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7", padding: "4px 10px", borderRadius: "9999px", fontWeight: 700 }}>
                    🛡️ Risk Reduction: {routePlan.trade_off?.safety_benefit_pct || "84"}% Lower Crime Exposure
                  </span>
                  <span style={{ fontSize: "0.78rem", background: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", padding: "4px 10px", borderRadius: "9999px", fontWeight: 700 }}>
                    ⏱️ Trade-off: +{routePlan.trade_off?.time_overhead_mins || 2.5} mins detour for verified safety
                  </span>
                </div>
              </div>

              {/* Emergency POIs Along Path */}
              <div style={{
                background: "rgba(30, 41, 59, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                padding: "1.25rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                    🚨 Nearby Emergency Stations
                  </h3>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Verified 24x7</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {routePlan.nearby_emergency_pois?.map((poi: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "12px",
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
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#38bdf8" }}>
                        {poi.distance_km} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Route Scenes & Step-by-Step Navigation Guidance */}
          {routePlan && (
            <div style={{ marginTop: "1.5rem" }}>
              <RouteNavigationGuidance
                routePlan={routePlan}
                city={selectedCity}
                safetyMode={safetyMode}
              />
            </div>
          )}
        </div>

        {/* ── 6. PROACTIVE SAFETY & SIMULATION STUDIO ───────────────────────────── */}
        <section style={{ marginBottom: "3.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span style={{
              fontSize: "0.76rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#fbbf24",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
            }}>
              ADVANCED SAFETY MODULES
            </span>
            <h2 style={{
              fontSize: "2rem",
              fontWeight: 900,
              color: "#f8fafc",
              letterSpacing: "-0.03em",
              margin: "10px 0 6px 0",
            }}>
              Proactive Safety & Simulation Studio
            </h2>
            <p style={{ fontSize: "0.95rem", color: "#94a3b8", maxWidth: 640, margin: "0 auto" }}>
              Live family safety monitoring, what-if threat stress-testing, and standalone voice assistance.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}>
            {/* Feature Studio Card 1: Family Safety Circle */}
            <div style={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "24px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}>
                    🛡️
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                      Family Safety Live Circle
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#60a5fa", fontWeight: 700 }}>
                      REAL-TIME GEOFENCE MONITORING
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Share encrypted live route trajectories with family members. Receive instant push notifications if a commuter deviates from the safe corridor.
                </p>
              </div>

              <button
                onClick={() => setIsFamilyModalOpen(true)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(59, 130, 246, 0.35)",
                }}
              >
                <span>🛡️ Launch Family Safety Mode</span>
              </button>
            </div>

            {/* Feature Studio Card 2: What-If Threat Simulator */}
            <div style={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "24px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}>
                    ⚡
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                      What-If Threat Simulator
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 700 }}>
                      STRESS-TEST DANGEROUS SCENARIOS
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Simulate peak night conditions, dark alley hazards, and sudden mob unrest to evaluate how the safety algorithm re-routes commuters to safety.
                </p>
              </div>

              <button
                onClick={() => setIsWhatIfModalOpen(true)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(245, 158, 11, 0.35)",
                }}
              >
                <span>⚡ Run What-If Simulation</span>
              </button>
            </div>

            {/* Feature Studio Card 3: Standalone Voice Agent */}
            <div style={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: "24px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    background: "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}>
                    🎙️
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                      Interactive Voice Agent
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#a5b4fc", fontWeight: 700 }}>
                      HANDS-FREE COMMUTE ESCORT
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Speak commands naturally in Hindi or English (e.g. "Mujhe Hauz Khas ka sabse safe rasta batao"). Instant bidirectional voice responses.
                </p>
              </div>

              <button
                onClick={() => setIsVoiceAgentModalOpen(true)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(99, 102, 241, 0.35)",
                }}
              >
                <span>🎙️ Launch Voice Agent</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 7. CARESYNC-STYLE REAL-TIME TELEMETRY & METRICS COUNTERS GRID ────── */}
        <section style={{ marginBottom: "3.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span style={{
              fontSize: "0.76rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#34d399",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}>
              REAL-TIME THREAT TELEMETRY
            </span>
            <h2 style={{
              fontSize: "2rem",
              fontWeight: 900,
              color: "#f8fafc",
              letterSpacing: "-0.03em",
              margin: "10px 0 6px 0",
            }}>
              Live Safety Network Metrics
            </h2>
            <p style={{ fontSize: "0.95rem", color: "#94a3b8", maxWidth: 600, margin: "0 auto" }}>
              Continuous sensor ingest, crowd report verification, and municipal CCTV corridor ratings.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.25rem",
          }}>
            {/* Counter 1 */}
            <div style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              padding: "1.75rem",
              backdropFilter: "blur(12px)",
            }}>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#38bdf8", letterSpacing: "-0.03em" }}>
                14.2 km
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>
                Active Safe Corridor
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
                High-density arterial highways with 100% illumination coverage
              </div>
              <div style={{
                height: 6,
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                marginTop: 14,
                overflow: "hidden",
              }}>
                <div style={{ width: "94%", height: "100%", background: "#38bdf8", borderRadius: 3 }} />
              </div>
            </div>

            {/* Counter 2 */}
            <div style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              padding: "1.75rem",
              backdropFilter: "blur(12px)",
            }}>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#34d399", letterSpacing: "-0.03em" }}>
                88 <span style={{ fontSize: "1.2rem", color: "#94a3b8" }}>/ 100</span>
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>
                Average Safety Score
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
                +34 points safer compared to unguided standard routes
              </div>
              <div style={{
                height: 6,
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                marginTop: 14,
                overflow: "hidden",
              }}>
                <div style={{ width: "88%", height: "100%", background: "#34d399", borderRadius: 3 }} />
              </div>
            </div>

            {/* Counter 3 */}
            <div style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              padding: "1.75rem",
              backdropFilter: "blur(12px)",
            }}>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#fbbf24", letterSpacing: "-0.03em" }}>
                0 False Pins
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>
                Verified Telemetry
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
                Multi-witness consensus algorithm prevents spam or fake reports
              </div>
              <div style={{
                height: 6,
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                marginTop: 14,
                overflow: "hidden",
              }}>
                <div style={{ width: "100%", height: "100%", background: "#fbbf24", borderRadius: 3 }} />
              </div>
            </div>

            {/* Counter 4 */}
            <div style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              padding: "1.75rem",
              backdropFilter: "blur(12px)",
            }}>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#c084fc", letterSpacing: "-0.03em" }}>
                36 States / UTs
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>
                Pan-India Safety Grid
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
                Full compliance with National Emergency Response System (112)
              </div>
              <div style={{
                height: 6,
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                marginTop: 14,
                overflow: "hidden",
              }}>
                <div style={{ width: "100%", height: "100%", background: "#c084fc", borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. UNBROKEN USER JOURNEY LIFECYCLE CONTROLLER ─────────────────────── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <JourneyLifecycleController
            selectedOrigin={cityMeta.presets[0]?.label.split(" → ")[0] || "Connaught Place"}
            selectedDestination={cityMeta.presets[0]?.label.split(" → ")[1] || "Saket"}
            onRouteHighlight={(type) => {
              if (type === "Safe") setSafetyMode("safest");
              else if (type === "Balanced") setSafetyMode("balanced");
              else setSafetyMode("fastest");
            }}
          />
        </div>

        {/* ── 9. ADVANCED MODULES: WHAT-IF SIMULATOR & LAST-MILE SAFETY ─────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginBottom: "3rem" }}>
          <WhatIfSimulator
            origin={cityMeta.presets[0]?.label.split(" → ")[0] || "Connaught Place"}
            destination={cityMeta.presets[0]?.label.split(" → ")[1] || "Saket"}
            city={selectedCity}
          />

          <LastMileSafetyCard
            origin={cityMeta.presets[0]?.label.split(" → ")[0] || "Connaught Place"}
            destination={cityMeta.presets[0]?.label.split(" → ")[1] || "Saket"}
            city={selectedCity}
          />
        </div>

        {/* ── 10. EMERGENCY & RAPID DISPATCH RESPONSE CENTER (AMBULANCE • POLICE • SOS) ── */}
        <section style={{ marginBottom: "3.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 14px",
              borderRadius: 9999,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              fontSize: "0.78rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}>
              🚨 24x7 Emergency Relay Grid
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "#f8fafc", margin: 0, letterSpacing: "-0.03em" }}>
              Emergency & Rapid Dispatch Center
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.92rem", maxWidth: 640, margin: "8px auto 0" }}>
              Instant zero-delay connection with National Medical Network (108), State Police ERSS (112), and High-Decibel Deterrent SOS Siren.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* 1. Ambulance Card */}
            <div style={{
              background: "rgba(30, 41, 59, 0.45)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 24,
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backdropFilter: "blur(12px)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    🚑
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                      108 Ambulance & Trauma
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#fca5a5", fontWeight: 700 }}>
                      National Medical Emergency Relay
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  Instant 108 ALS Ambulance dispatch, verified trauma center locator (AIIMS, Safdarjung, Manipal), live oxygen tracking, and 1-tap call.
                </p>
              </div>

              <button
                onClick={() => openEmergencyHub("ambulance")}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(239, 68, 68, 0.35)",
                }}
              >
                🚑 Dispatch Ambulance (108)
              </button>
            </div>

            {/* 2. Police Card */}
            <div style={{
              background: "rgba(30, 41, 59, 0.45)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: 24,
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backdropFilter: "blur(12px)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    👮
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                      112 ERSS Police Dispatch
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#93c5fd", fontWeight: 700 }}>
                      Police Control Room & Pink Booth
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  Relays live coordinates to State Police Command, assigns nearest PCR Van Romeo unit, and locates nearest Pink Booths for women safety.
                </p>
              </div>

              <button
                onClick={() => openEmergencyHub("police")}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(59, 130, 246, 0.35)",
                }}
              >
                👮 Dispatch Police (112)
              </button>
            </div>

            {/* 3. Instant SOS Card */}
            <div style={{
              background: "rgba(30, 41, 59, 0.45)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              borderRadius: 24,
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backdropFilter: "blur(12px)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    🚨
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                      Instant SOS & Siren Alarm
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#fde047", fontWeight: 700 }}>
                      Deterrent Synthesizer & Multi-Relay
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  Emits high-decibel audible emergency alarm from device speakers while broadcasting encrypted GPS beacon to family and authorities.
                </p>
              </div>

              <button
                onClick={() => openEmergencyHub("sos")}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #eab308, #ca8a04)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#000",
                  fontSize: "0.88rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(234, 179, 8, 0.35)",
                }}
              >
                🚨 Activate SOS & Siren Alarm
              </button>
            </div>
          </div>
        </section>

        {/* ── 11. CARESYNC-STYLE BOTTOM PITCH BANNER ───────────────────────────── */}
        <section style={{
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 50%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.4)",
          borderRadius: "28px",
          padding: "3rem 2rem",
          textAlign: "center",
          marginBottom: "3rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(59, 130, 246, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}>
          <h2 style={{
            fontSize: "2.2rem",
            fontWeight: 900,
            color: "#f8fafc",
            letterSpacing: "-0.03em",
            marginBottom: "12px",
          }}>
            Ready to Experience Next-Gen Safe Navigation?
          </h2>
          <p style={{
            fontSize: "1.05rem",
            color: "#cbd5e1",
            maxWidth: 680,
            margin: "0 auto 2rem",
            lineHeight: 1.6,
          }}>
            Join thousands of daily commuters and law enforcement agencies transforming urban mobility with proactive AI intelligence.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={scrollToMap}
              style={{
                padding: "14px 28px",
                borderRadius: "9999px",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(59, 130, 246, 0.4)",
              }}
            >
              🚀 Explore Safe Routes Now
            </button>
            <a
              href="/police/login"
              style={{
                padding: "14px 24px",
                borderRadius: "9999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#f8fafc",
                fontSize: "0.95rem",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              👮 Police Command Portal
            </a>
          </div>
        </section>

        {/* ── 11. CARESYNC-STYLE MODERN SAAS FOOTER ────────────────────────────── */}
        <footer style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          paddingTop: "2.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "2rem",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}>
                🛡️
              </div>
              <span style={{ fontWeight: 900, fontSize: "1.05rem", color: "#f8fafc" }}>
                Rakshak<span style={{ color: "#38bdf8" }}>AI</span>
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.6 }}>
              India's Autonomous AI Crime Intelligence & Safe Route Navigation Platform. Empowering citizens with real-time threat avoidance.
            </p>
          </div>

          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Safety Navigation
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem", color: "#94a3b8" }}>
              <span style={{ cursor: "pointer" }} onClick={() => { setSafetyMode("safest"); scrollToMap(); }}>🛡️ Safest / Women Safe Routing</span>
              <span style={{ cursor: "pointer" }} onClick={() => { setSafetyMode("fastest"); scrollToMap(); }}>⚡ Fastest / Night Safety Mode</span>
              <span style={{ cursor: "pointer" }} onClick={() => { setSafetyMode("balanced"); scrollToMap(); }}>⚖️ Balanced Corridor</span>
              <span style={{ cursor: "pointer" }} onClick={scrollToMap}>🔥 Live Spatial Heatmap</span>
              <span style={{ cursor: "pointer" }} onClick={openCopilot}>🤖 Multilingual AI Copilot</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Civic & Law Enforcement
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem", color: "#94a3b8" }}>
              <a href="/police/login" style={{ color: "#94a3b8", textDecoration: "none" }}>👮 Police Command Center</a>
              <span>🚨 ERSS 112 Dispatch Relay</span>
              <span>📍 Verified Pink Booth Registry</span>
              <span>🏥 Hospital Trauma Network</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Data Governance
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem", color: "#94a3b8" }}>
              <span>🔒 DPDP Act 2023 Compliant</span>
              <span>🛡️ AES-256 Encrypted Telemetry</span>
              <span>⚙️ Zero-Knowledge Geolocation</span>
              <span>© 2026 Rakshak AI. All rights reserved.</span>
            </div>
          </div>
        </footer>

      </main>

      {/* Layer 7 Platform Diagnostics & Subsystem Health Drawer */}
      <PlatformHealthDrawer />

      {/* Floating Emergency SOS Component */}
      <SOSButton city={selectedCity} userCoords={startCoords} />

      {/* Primary Emergency Hub Modal (Ambulance 108 • Police 112 • Instant SOS Siren) */}
      <EmergencyHubModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        city={selectedCity}
        userCoords={startCoords}
        initialTab={emergencyTab}
      />

      {/* Community Incident Report Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        city={selectedCity}
        initialLat={reportCoords.lat}
        initialLon={reportCoords.lon}
      />

      {/* Family Safety Mode Modal */}
      <FamilySafetyModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        origin={cityMeta.presets[0]?.label.split(" → ")[0] || "Connaught Place"}
        destination={cityMeta.presets[0]?.label.split(" → ")[1] || "Saket"}
        city={selectedCity}
      />

      {/* Floating Rakshak AI Voice Copilot & Route Traverser */}
      <RakshakAICopilot
        city={selectedCity}
        routeData={routePlan}
        onApplyRoute={handleApplyAIRoute}
        onSelectCity={(c) => setSelectedCity(c)}
        onOpenReport={(lat, lon) => {
          setReportCoords({ lat: lat || startCoords[0], lon: lon || startCoords[1] });
          setIsReportModalOpen(true);
        }}
      />

      {/* Standalone Voice Agent Modal */}
      <VoiceAgentModal
        isOpen={isVoiceAgentModalOpen}
        onClose={() => setIsVoiceAgentModalOpen(false)}
        onSelectRoute={(route) => {
          if (route) {
            setRoutePlan(route);
          }
        }}
      />

      {/* Standalone What-If Stress-Testing Modal */}
      <WhatIfSimulatorModal
        isOpen={isWhatIfModalOpen}
        onClose={() => setIsWhatIfModalOpen(false)}
        sourceCoords={{ lat: startCoords[0], lng: startCoords[1] }}
        destCoords={{ lat: destCoords[0], lng: destCoords[1] }}
        onApplySimulatedRoute={(routes) => {
          if (routes) {
            setRoutePlan(routes);
          }
        }}
      />
    </div>
  );
}


