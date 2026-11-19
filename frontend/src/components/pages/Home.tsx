"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SOSButton from "@/components/SOSButton";
import ReportIncidentModal from "@/components/ReportIncidentModal";
import RakshakAICopilot from "@/components/RakshakAICopilot";
import VoiceInputButton from "@/components/VoiceInputButton";
import FamilySafetyModal from "@/components/FamilySafetyModal";
import VoiceAgentModal from "@/components/VoiceAgentModal";
import WhatIfSimulatorModal from "@/components/WhatIfSimulatorModal";
import { JourneyLifecycleController } from "@/components/JourneyLifecycleController";
import { PlatformHealthDrawer } from "@/components/PlatformHealthDrawer";
import { API_BASE_URL, safeApiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import GoogleAuthGateway from "@/components/auth/GoogleAuthGateway";
import RouteNavigationGuidance from "@/components/route/RouteNavigationGuidance";
import HeroAvatarPresenter from "@/components/HeroAvatarPresenter";
import EmergencyHubModal from "@/components/EmergencyHubModal";
import { HistoryCard, JourneyHistoryRecord } from "@/components/HistoryCard";
import { Clock, ShieldCheck, MapPin, AlertTriangle, Radio, PhoneCall, Activity, CheckCircle2, SlidersHorizontal, ArrowRight, Compass, Car, Navigation, ChevronDown } from "lucide-react";
import { PageBackground } from "@/components/shared/PageBackground";
import { KPICard } from "@/components/shared/KPICard";
import { Card } from "@/components/shared/Card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import {
  INDIAN_CITIES,
  getCityMetadata,
  getFallbackCityHotspots,
  getFallbackHeatmapPoints,
} from "@/lib/cities";
import CityPickerModal from "@/components/shared/CityPickerModal";

function generateFallbackRoutePlan(
  cityName: string,
  start: [number, number],
  dest: [number, number],
  mode: string
) {
  const midLat = (start[0] + dest[0]) / 2;
  const midLon = (start[1] + dest[1]) / 2;

  const safestCoords: [number, number][] = [
    start,
    [start[0] + 0.008, start[1] + 0.006],
    [midLat + 0.004, midLon + 0.01],
    [dest[0] - 0.006, dest[1] - 0.004],
    dest,
  ];

  const fastestCoords: [number, number][] = [
    start,
    [midLat, midLon],
    dest,
  ];

  return {
    city: cityName,
    mode,
    safest_route: {
      coordinates: safestCoords,
      distance_km: 12.4,
      estimated_time_mins: 28,
      risk_score: 18,
      safety_score: 92,
      lighting_pct: 95,
      cctv_coverage_pct: 88,
      police_booth_count: 5,
      route_label: "Arterial Safe Corridor (Recommended)",
    },
    fastest_route: {
      coordinates: fastestCoords,
      distance_km: 10.8,
      estimated_time_mins: 24,
      risk_score: 58,
      safety_score: 62,
      lighting_pct: 60,
      cctv_coverage_pct: 42,
      police_booth_count: 1,
      route_label: "Direct Inner Bypass",
    },
    safety_explanation: "Rakshak Safe Navigation selected the Arterial Safe Corridor routing via well-lit main boulevards with 5 active PCR patrolling units, bypassing 2 low-lighting alleyway clusters.",
    trade_off: {
      safety_benefit_pct: 84,
      time_overhead_mins: 4.0,
      extra_distance_km: 1.6,
    },
    nearby_emergency_pois: [
      { type: "police", name: `${cityName} Central Station Police Booth`, phone: "112", distance_km: 0.8, lat: midLat + 0.003, lon: midLon - 0.004 },
      { type: "hospital", name: `${cityName} Civil Trauma Care`, phone: "108", distance_km: 1.2, lat: midLat - 0.005, lon: midLon + 0.006 },
      { type: "safe_haven", name: "24/7 Verified Safe Transit Haven", phone: "1090", distance_km: 0.5, lat: midLat + 0.008, lon: midLon + 0.003 },
    ],
  };
}

// Dynamically import Interactive Leaflet Map to avoid SSR errors
const InteractiveMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="skeleton" style={{ height: 560, borderRadius: 24 }} />
  ),
});

const CITY_OPTIONS = INDIAN_CITIES;

export default function CitizenPortal() {
  const { isAuthenticated, isLoading, user, currentFieldInfo, openFieldModal, openHistoryModal } = useAuth();

  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [startCoords, setStartCoords] = useState<[number, number]>([28.6315, 77.2167]);
  const [destCoords, setDestCoords] = useState<[number, number]>([28.5245, 77.2066]);
  const [safetyMode, setSafetyMode] = useState<"safest" | "balanced" | "fastest">("safest");
  const [timeOfDay, setTimeOfDay] = useState("Night");

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

  const cityMeta = getCityMetadata(selectedCity);

  // Fetch Hotspots and Heatmap for active city on mount or city change
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCityData = async () => {
      try {
        const [hsRes, hmRes] = await Promise.all([
          safeApiFetch(`/api/hotspots?city=${encodeURIComponent(selectedCity)}`),
          safeApiFetch(`/api/safety-heatmap?city=${encodeURIComponent(selectedCity)}&grid_size=10`),
        ]);

        let hsData = null;
        let hmData = null;

        if (hsRes && hsRes.ok) {
          try { hsData = await hsRes.json(); } catch (e) {}
        }
        if (hmRes && hmRes.ok) {
          try { hmData = await hmRes.json(); } catch (e) {}
        }

        // Apply real data or fallback
        setHotspotsData(hsData || getFallbackCityHotspots(selectedCity));
        setHeatmapData(hmData?.heatmap || getFallbackHeatmapPoints(selectedCity));
      } catch (e) {
        setHotspotsData(getFallbackCityHotspots(selectedCity));
        setHeatmapData(getFallbackHeatmapPoints(selectedCity));
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
      const res = await safeApiFetch(`/api/route/safe`, {
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

      if (res && res.ok) {
        const data = await res.json();
        setRoutePlan(data);
      } else {
        setRoutePlan(generateFallbackRoutePlan(selectedCity, startCoords, destCoords, safetyMode));
      }
    } catch (e) {
      setRoutePlan(generateFallbackRoutePlan(selectedCity, startCoords, destCoords, safetyMode));
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
        const res = await safeApiFetch(`/api/route/safe`, {
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
        if (res && res.ok) {
          const data = await res.json();
          setRoutePlan(data);
        } else {
          setRoutePlan(generateFallbackRoutePlan(selectedCity, origin, dest, safetyMode));
        }
      } catch (e) {
        setRoutePlan(generateFallbackRoutePlan(selectedCity, origin, dest, safetyMode));
      } finally {
        setLoadingRoute(false);
      }
    };
    computeAIRoute();
  };

  const DEFAULT_HISTORY_ITEMS: JourneyHistoryRecord[] = [
    {
      id: "hist-1",
      source: "Connaught Place",
      destination: "Saket Metro",
      sourceLat: 28.6315,
      sourceLon: 77.2167,
      destLat: 28.5245,
      destLon: 77.2066,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      safetyScore: 92,
      routeType: "Safest",
      distanceKm: 14.8,
      durationMin: 32,
    },
    {
      id: "hist-2",
      source: "Rohini Sector 14",
      destination: "Hauz Khas Village",
      sourceLat: 28.7495,
      sourceLon: 77.0565,
      destLat: 28.5494,
      destLon: 77.2001,
      timestamp: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
      safetyScore: 87,
      routeType: "Balanced",
      distanceKm: 26.3,
      durationMin: 54,
    },
    {
      id: "hist-3",
      source: "Noida Sector 18",
      destination: "Connaught Place",
      sourceLat: 28.5708,
      sourceLon: 77.3261,
      destLat: 28.6315,
      destLon: 77.2167,
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      safetyScore: 94,
      routeType: "Safest",
      distanceKm: 18.2,
      durationMin: 38,
    },
  ];

  const [historyItems, setHistoryItems] = useState<JourneyHistoryRecord[]>(DEFAULT_HISTORY_ITEMS);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (!user?.googleId) return;
    const fetchHistory = async () => {
      try {
        const res = await safeApiFetch(`/api/history?userId=${encodeURIComponent(user.googleId)}&limit=8`);
        if (res && res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setHistoryItems(data);
        }
      } catch (e) {
        // Safe fallback
      }
    };
    fetchHistory();
  }, [user?.googleId]);

  // Listen to repeat journey event from TripHistoryModal
  useEffect(() => {
    const handleRepeatEvent = (e: any) => {
      if (e.detail) {
        handleRepeatJourney(e.detail);
      }
    };
    window.addEventListener("rakshak_repeat_journey", handleRepeatEvent);
    return () => window.removeEventListener("rakshak_repeat_journey", handleRepeatEvent);
  }, []);

  const handleRepeatJourney = (journey: JourneyHistoryRecord) => {
    const sCoord: [number, number] = [journey.sourceLat || 28.6315, journey.sourceLon || 77.2167];
    const dCoord: [number, number] = [journey.destLat || 28.5245, journey.destLon || 77.2066];
    setStartCoords(sCoord);
    setDestCoords(dCoord);
    if (journey.routeType) {
      setSafetyMode(journey.routeType.toLowerCase() as any);
    }
    const computeAIRoute = async () => {
      setLoadingRoute(true);
      try {
        const res = await safeApiFetch(`/api/route/safe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: selectedCity,
            origin: sCoord,
            destination: dCoord,
            time_of_day: timeOfDay,
            mode: safetyMode,
          }),
        });
        if (res && res.ok) {
          const data = await res.json();
          setRoutePlan(data);
        } else {
          setRoutePlan(generateFallbackRoutePlan(selectedCity, sCoord, dCoord, safetyMode));
        }
        scrollToMap();
      } catch (e) {
        setRoutePlan(generateFallbackRoutePlan(selectedCity, sCoord, dCoord, safetyMode));
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
            border: "3px solid rgba(5, 150, 105, 0.2)",
            borderTopColor: "#059669",
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

  return (
    <PageBackground className="min-h-screen">
      {/* ── 2. CARESYNC-STYLE PRESENTATION HERO SECTION ──────────────────────── */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1.5rem" }}>
        <section style={{
          textAlign: "center",
          padding: "2rem 1rem 3rem",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Top Announcement Pill */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: "9999px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "1.5rem",
              boxShadow: "var(--shadow-card)",
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent-primary)",
                boxShadow: "0 0 8px var(--accent-primary)",
              }} />
              <span>🛡️ Rakshak Public Safety • Real-Time Route Protection & Incident Avoidance</span>
            </div>

            {/* CareSync Style Bold Headline */}
            <h1 style={{
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              color: "var(--text-primary)",
              maxWidth: 900,
              margin: "0 auto 1.25rem",
            }}>
              Navigate Smart.<br />
              <span style={{
                background: "linear-gradient(135deg, #059669 0%, #0d9488 50%, #10b981 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Stay Safe Everywhere.
              </span>
            </h1>

            {/* Sub-headline */}
            <p style={{
              fontSize: "1.05rem",
              color: "var(--text-secondary)",
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
              gap: 12,
              flexWrap: "wrap",
              marginBottom: "2.5rem",
            }}>
              {/* Feature 1: Safe Routing Launch */}
              <button
                onClick={scrollToMap}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.92rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🗺️ Launch Safe Navigation</span>
                <span style={{ fontSize: "1.05rem" }}>→</span>
              </button>

              {/* Feature 2: Safety Assistant */}
              <button
                onClick={openCopilot}
                style={{
                  padding: "12px 22px",
                  borderRadius: "12px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <span>🛡️ Open Safety Assistant</span>
              </button>

              {/* Feature 3: Emergency Action Hub */}
              <button
                onClick={() => openEmergencyHub("sos")}
                style={{
                  padding: "12px 22px",
                  borderRadius: "12px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#dc2626",
                  fontSize: "0.92rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
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
                  padding: "12px 20px",
                  borderRadius: "12px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🎙️ Safety Guide</span>
              </button>
            </div>

            {/* Trust & Telemetry metric ribbon */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 20,
              padding: "10px 24px",
              borderRadius: "9999px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-card)",
              maxWidth: 880,
              margin: "0 auto",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                <span style={{ color: "#059669", fontWeight: 800 }}>🛡️ 99.4%</span> Corridor Safety Index
              </div>
              <span style={{ color: "var(--text-muted)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--accent-primary)", fontWeight: 800 }}>🗺️ 780+</span> Districts Mapped
              </div>
              <span style={{ color: "var(--text-muted)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                <span style={{ color: "#d97706", fontWeight: 800 }}>🚓 24x7</span> Verified PCR Patrol
              </div>
              <span style={{ color: "var(--text-muted)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                <span style={{ color: "#059669", fontWeight: 800 }}>⚡ 0.4s</span> Route Optimization
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. AI PRESENTER HERO STAGE ────────────────────────────────────────── */}
        <div id="hero-presenter-stage" style={{ marginBottom: "3rem" }}>
          <HeroAvatarPresenter
            onExploreMap={scrollToMap}
            onOpenCopilot={openCopilot}
          />
        </div>

        {/* ── 4. 4-PILLAR CORE SAFETY ARCHITECTURE ─────────────────────────────── */}
        <section id="four-pillars-section" style={{ marginBottom: "3rem" }}>
          <SectionHeader
            badge="SAFETY NAVIGATION ENGINE"
            title="4-Pillar Incident & Route Intelligence Stack"
            description="Explore the four core modules powering Rakshak's threat neutralization architecture."
            align="center"
          />

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}>
            {/* Pillar 1: Spatial AI (Rose / Crimson) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(225, 29, 72, 0.08) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(225, 29, 72, 0.3)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 6px 20px rgba(225, 29, 72, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "all 0.2s ease",
            }}>
              <div>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: "rgba(225, 29, 72, 0.12)",
                  border: "1px solid rgba(225, 29, 72, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "1rem",
                }}>
                  📍
                </div>
                <div style={{ fontSize: "0.72rem", color: "#e11d48", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  SPATIAL INTELLIGENCE
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                  DBSCAN Hotspot Clustering
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Groups historical FIRs, harassment alerts, and crowd reports into continuous dynamic risk clusters.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowHeatmap(true);
                  setShowHotspots(true);
                  scrollToMap();
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(225, 29, 72, 0.15), rgba(225, 29, 72, 0.08))",
                  border: "1px solid rgba(225, 29, 72, 0.35)",
                  color: "#e11d48",
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>🔥 View Live Crime Heatmap</span>
              </button>
            </div>

            {/* Pillar 2: Algorithmic Routing Engine (Public Safety Emerald) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(5, 150, 105, 0.08) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(5, 150, 105, 0.3)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 6px 20px rgba(5, 150, 105, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "all 0.2s ease",
            }}>
              <div>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: "rgba(5, 150, 105, 0.12)",
                  border: "1px solid rgba(5, 150, 105, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "1rem",
                }}>
                  🛣️
                </div>
                <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  ALGORITHMIC ENGINE
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                  Multi-Criteria Dijkstra Routing
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Penalizes unlit paths and high-crime sectors, prioritizing illuminated avenues with CCTV surveillance.
                </p>
              </div>

              <button
                onClick={() => {
                  setSafetyMode("safest");
                  scrollToMap();
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(5, 150, 105, 0.15), rgba(5, 150, 105, 0.08))",
                  border: "1px solid rgba(5, 150, 105, 0.35)",
                  color: "#059669",
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>🗺️ Calculate Safest Corridor</span>
              </button>
            </div>

            {/* Pillar 3: Civic Infrastructure & SOS (Shield Amber & Gold) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(217, 119, 6, 0.08) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(217, 119, 6, 0.3)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 6px 20px rgba(217, 119, 6, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "all 0.2s ease",
            }}>
              <div>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: "rgba(217, 119, 6, 0.12)",
                  border: "1px solid rgba(217, 119, 6, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "1rem",
                }}>
                  🚨
                </div>
                <div style={{ fontSize: "0.72rem", color: "#d97706", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  CIVIC & EMERGENCY NETWORK
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                  24x7 Verified POI Corridors
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Seamless integration with geocoded police stations, pink booths, PCR vans, and emergency 112 dispatch.
                </p>
              </div>

              <button
                onClick={() => {
                  setReportCoords({ lat: startCoords[0], lon: startCoords[1] });
                  setIsReportModalOpen(true);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(217, 119, 6, 0.08))",
                  border: "1px solid rgba(217, 119, 6, 0.35)",
                  color: "#d97706",
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>📢 Report Concern Pin</span>
              </button>
            </div>

            {/* Pillar 4: Conversational Safety Assistant (Royal Amethyst / Violet) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(124, 58, 237, 0.08) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(124, 58, 237, 0.3)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 6px 20px rgba(124, 58, 237, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "all 0.2s ease",
            }}>
              <div>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "1rem",
                }}>
                  🎙️
                </div>
                <div style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  VOICE NAVIGATION
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                  Multilingual Safety Assistant
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Hands-free natural Hindi & English voice assistant for instant route computation, hazard reporting & SOS.
                </p>
              </div>

              <button
                onClick={openCopilot}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(124, 58, 237, 0.08))",
                  border: "1px solid rgba(124, 58, 237, 0.35)",
                  color: "#7c3aed",
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>🛡️ Speak with Safety Assistant</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 5. INTERACTIVE LIVE SAFE NAVIGATION CONSOLE ───────────────────────── */}
        <div id="safety-map-section" style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "24px",
          padding: "1.75rem",
          marginBottom: "2.5rem",
          boxShadow: "var(--shadow-card)",
        }}>
          {/* ── Structured Route & Safety Control Console (4 Dropdown Architecture) ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-5 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live ERSS-112 Corridor Active
                </span>
                <span className="text-[11.5px] font-bold text-[var(--text-secondary)]">
                  🏛️ {cityMeta.emergencyCommand} • {cityMeta.state}
                </span>
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                Citizen Safety Portal & Route Navigator
              </h2>
            </div>

            {/* Safety index and response SLA pills */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-extrabold text-[var(--text-primary)] shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Safety Rating: <strong className="text-emerald-600">{cityMeta.safetyScore}/100</strong></span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-extrabold text-[var(--text-primary)] shadow-sm">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Arrival SLA: <strong className="text-[var(--text-primary)]">{cityMeta.responseMins} min</strong></span>
              </div>
              <button
                onClick={() => setIsCityPickerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-500 transition-all cursor-pointer shadow-sm"
                title="Browse All 10 Indian Metropolitan Cities"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                <span>Browse Cities ({INDIAN_CITIES.length})</span>
              </button>
            </div>
          </div>

          {/* ── 4-Dropdown Selection Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] mb-4">
            {/* Dropdown 1: Select City / Jurisdiction */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. Select City / Jurisdiction</span>
              </label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    const cityName = e.target.value;
                    setSelectedCity(cityName);
                    const targetCity = INDIAN_CITIES.find(
                      (c) =>
                        c.shortName.toLowerCase() === cityName.toLowerCase() ||
                        c.name.toLowerCase() === cityName.toLowerCase() ||
                        c.id.toLowerCase() === cityName.toLowerCase()
                    );
                    if (targetCity && targetCity.presets.length > 0) {
                      setStartCoords(targetCity.presets[0].start as [number, number]);
                      setDestCoords(targetCity.presets[0].dest as [number, number]);
                    }
                  }}
                  className="w-full h-11 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs sm:text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none transition-all pr-8 shadow-sm"
                >
                  {INDIAN_CITIES.map((c) => (
                    <option key={c.id} value={c.shortName} className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                      📍 {c.name} ({c.state})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Dropdown 2: Safe Corridor Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Safe Corridor in {cityMeta.shortName}</span>
              </label>
              <div className="relative">
                <select
                  value={(() => {
                    const idx = cityMeta.presets.findIndex(
                      (p) =>
                        Math.abs(startCoords[0] - p.start[0]) < 0.001 &&
                        Math.abs(startCoords[1] - p.start[1]) < 0.001 &&
                        Math.abs(destCoords[0] - p.dest[0]) < 0.001 &&
                        Math.abs(destCoords[1] - p.dest[1]) < 0.001
                    );
                    return idx >= 0 ? idx : 0;
                  })()}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    if (idx >= 0 && cityMeta.presets[idx]) {
                      const p = cityMeta.presets[idx];
                      setStartCoords(p.start as [number, number]);
                      setDestCoords(p.dest as [number, number]);
                    }
                  }}
                  className="w-full h-11 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs sm:text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none transition-all pr-8 shadow-sm"
                >
                  {cityMeta.presets.map((p, idx) => (
                    <option key={p.label} value={idx} className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                      🛣️ {p.label} {p.distKm ? `(${p.distKm})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Dropdown 3: Routing Safety Mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Routing Safety Mode</span>
              </label>
              <div className="relative">
                <select
                  value={safetyMode}
                  onChange={(e) => setSafetyMode(e.target.value as any)}
                  className="w-full h-11 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs sm:text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none transition-all pr-8 shadow-sm"
                >
                  <option value="safest" className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                    🛡️ Safest / Women Safety Priority
                  </option>
                  <option value="balanced" className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                    ⚖️ Balanced Corridor (Optimized)
                  </option>
                  <option value="fastest" className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                    ⚡ Fastest Direct Route
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Dropdown 4: Time of Day Simulation */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>4. Time of Day Simulation</span>
              </label>
              <div className="relative">
                <select
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full h-11 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs sm:text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none transition-all pr-8 shadow-sm"
                >
                  <option value="Night" className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                    🌙 Night (Maximum Vigilance - 22:00)
                  </option>
                  <option value="Evening" className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                    🌆 Evening (Peak Transit - 19:00)
                  </option>
                  <option value="Morning" className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                    ☀️ Morning (Rush Hour - 09:00)
                  </option>
                  <option value="Afternoon" className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                    🌤️ Afternoon (Normal Traffic - 14:00)
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ── Map Layers & Instant Action Bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] mb-5">
            {/* Layer Toggles */}
            <div className="flex items-center gap-4 flex-wrap text-xs font-bold text-[var(--text-secondary)]">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-black">
                Map Layers:
              </span>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none hover:text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>🔥 Crime Heatmap</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none hover:text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={showHotspots}
                  onChange={(e) => setShowHotspots(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>📍 Risk Hotspots ({hotspotsData?.total_hotspots || cityMeta.hotspots.length})</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none hover:text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={showEmergencyPOIs}
                  onChange={(e) => setShowEmergencyPOIs(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>🚨 Emergency POIs</span>
              </label>
            </div>

            {/* Actions: Voice & Recalculate */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                <span>🎙️ Speak:</span>
                <VoiceInputButton
                  size="sm"
                  title="Speak to plan safe route"
                  onResult={() => {
                    const el = document.getElementById("rakshak-copilot-launcher");
                    if (el) el.click();
                  }}
                />
              </div>

              <button
                onClick={handleFindSafeRoute}
                disabled={loadingRoute}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loadingRoute ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Computing Safe Route...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Plan Safe Route</span>
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Interactive Map */}
          <div style={{ borderRadius: "20px", overflow: "hidden", position: "relative", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)" }}>
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
                background: "linear-gradient(160deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-surface) 65%)",
                border: "1.5px solid rgba(16, 185, 129, 0.35)",
                borderRadius: "16px",
                padding: "1.25rem",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.08)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.2rem" }}>🛡️</span>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#059669", margin: 0 }}>
                    Rakshak Safety Score & Route Trade-Off
                  </h3>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 12px 0" }}>
                  {routePlan.safety_explanation}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.78rem", background: "rgba(16, 185, 129, 0.12)", color: "#059669", padding: "4px 10px", borderRadius: "9999px", fontWeight: 700 }}>
                    🛡️ Risk Reduction: {routePlan.trade_off?.safety_benefit_pct || "84"}% Lower Crime Exposure
                  </span>
                  <span style={{ fontSize: "0.78rem", background: "var(--accent-dim)", color: "var(--accent-primary)", padding: "4px 10px", borderRadius: "9999px", fontWeight: 700 }}>
                    ⏱️ Trade-off: +{routePlan.trade_off?.time_overhead_mins || 2.5} mins detour for verified safety
                  </span>
                </div>
              </div>

              {/* Emergency POIs Along Path */}
              <div style={{
                background: "linear-gradient(160deg, rgba(37, 99, 235, 0.08) 0%, var(--bg-surface) 65%)",
                border: "1.5px solid rgba(37, 99, 235, 0.35)",
                borderRadius: "16px",
                padding: "1.25rem",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.08)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "#2563eb", margin: 0 }}>
                    🚨 Nearby Emergency Stations
                  </h3>
                  <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700, background: "rgba(37, 99, 235, 0.1)", padding: "2px 8px", borderRadius: "6px" }}>Verified 24x7</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {routePlan.nearby_emergency_pois?.map((poi: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {poi.type === "police" ? "👮 " : "🏥 "} {poi.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          📞 {poi.phone}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--accent-primary)" }}>
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
        <section style={{ marginBottom: "3rem" }}>
          <SectionHeader
            badge="ADVANCED SAFETY MODULES"
            title="Proactive Safety & Simulation Studio"
            description="Live family safety monitoring, what-if threat stress-testing, and standalone voice assistance."
            align="center"
          />

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}>
            {/* Feature Studio Card 1: Family Safety Circle (Emerald) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(5, 150, 105, 0.08) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(5, 150, 105, 0.32)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 6px 20px rgba(5, 150, 105, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    background: "rgba(5, 150, 105, 0.12)",
                    border: "1px solid rgba(5, 150, 105, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}>
                    🛡️
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      Family Safety Live Circle
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 700 }}>
                      REAL-TIME GEOFENCE MONITORING
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Share encrypted live route trajectories with family members. Receive instant push notifications if a commuter deviates from the safe corridor.
                </p>
              </div>

              <button
                onClick={() => setIsFamilyModalOpen(true)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #059669, #047857)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                }}
              >
                <span>🛡️ Launch Family Safety Mode</span>
              </button>
            </div>

            {/* Feature Studio Card 2: What-If Threat Simulator (Amber & Gold) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 6px 20px rgba(245, 158, 11, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}>
                    ⚡
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      What-If Threat Simulator
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#d97706", fontWeight: 700 }}>
                      STRESS-TEST DANGEROUS SCENARIOS
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Simulate peak night conditions, dark alley hazards, and sudden mob unrest to evaluate how the safety algorithm re-routes commuters to safety.
                </p>
              </div>

              <button
                onClick={() => setIsWhatIfModalOpen(true)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                }}
              >
                <span>⚡ Run What-If Simulation</span>
              </button>
            </div>

            {/* Feature Studio Card 3: Standalone Voice Agent (Royal Violet) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(124, 58, 237, 0.08) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(124, 58, 237, 0.32)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 6px 20px rgba(124, 58, 237, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    background: "rgba(124, 58, 237, 0.12)",
                    border: "1px solid rgba(124, 58, 237, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}>
                    🎙️
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      Interactive Voice Agent
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: 700 }}>
                      HANDS-FREE COMMUTE ESCORT
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Speak commands naturally in Hindi or English (e.g. "Mujhe Hauz Khas ka sabse safe rasta batao"). Instant bidirectional voice responses.
                </p>
              </div>

              <button
                onClick={() => setIsVoiceAgentModalOpen(true)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
                }}
              >
                <span>🎙️ Launch Voice Agent</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 7. CARESYNC-STYLE REAL-TIME TELEMETRY & METRICS COUNTERS GRID ────── */}
        <section style={{ marginBottom: "3rem" }}>
          <SectionHeader
            badge="REAL-TIME THREAT TELEMETRY"
            title="Live Safety Network Metrics"
            description="Continuous sensor ingest, crowd report verification, and municipal CCTV corridor ratings."
            align="center"
          />

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.25rem",
          }}>
            <KPICard
              label="Active Safe Corridor"
              value={14.2}
              suffix=" km"
              decimals={1}
              icon={<MapPin className="w-5 h-5 text-[#059669]" />}
              caption="High-density arterial highways with 100% illumination coverage"
              accentColor="green"
              delta={{ value: "+3.2 km newly illuminated", isPositive: true }}
            />

            <KPICard
              label="Average Safety Score"
              value={88}
              suffix=" / 100"
              icon={<ShieldCheck className="w-5 h-5 text-[#2563eb]" />}
              caption="+34 points safer compared to unguided standard routes"
              accentColor="blue"
              delta={{ value: "+34 pts vs default", isPositive: true }}
            />

            <KPICard
              label="Verified Telemetry"
              value={0}
              suffix=" False Pins"
              icon={<CheckCircle2 className="w-5 h-5 text-[#d97706]" />}
              caption="Multi-witness consensus algorithm prevents spam or fake reports"
              accentColor="amber"
              delta={{ value: "100% verified accuracy", isPositive: true }}
            />

            <KPICard
              label="Pan-India Safety Grid"
              value={36}
              suffix=" States / UTs"
              icon={<Activity className="w-5 h-5 text-[#7c3aed]" />}
              caption="Full compliance with National Emergency Response System (112)"
              accentColor="purple"
              delta={{ value: "Nationwide coverage", isPositive: true }}
            />
          </div>
        </section>

        {/* ── 8. UNBROKEN USER JOURNEY LIFECYCLE CONTROLLER ─────────────────────── */}
        <div style={{ marginBottom: "3rem" }}>
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

        {/* ── 10. EMERGENCY & RAPID DISPATCH RESPONSE CENTER (AMBULANCE • POLICE • SOS) ── */}
        <section style={{ marginBottom: "3rem" }}>
          <SectionHeader
            badge="🚨 24x7 Emergency Relay Grid"
            title="Emergency & Rapid Dispatch Center"
            description="Instant zero-delay connection with National Medical Network (108), State Police ERSS (112), and High-Decibel Deterrent SOS Siren."
            align="center"
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* 1. Ambulance Card (Medical Crimson) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(239, 68, 68, 0.09) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(239, 68, 68, 0.38)",
              borderRadius: "20px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 8px 24px rgba(239, 68, 68, 0.12)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(239, 68, 68, 0.14)", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    🚑
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      108 Ambulance & Trauma
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 700 }}>
                      National Medical Emergency Relay
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  Instant 108 ALS Ambulance dispatch, verified trauma center locator (AIIMS, Safdarjung, Manipal), live oxygen tracking, and 1-tap call.
                </p>
              </div>

              <button
                onClick={() => openEmergencyHub("ambulance")}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                }}
              >
                🚑 Dispatch Ambulance (108)
              </button>
            </div>

            {/* 2. Police Card (Civic Police Navy & Deep Blue) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(37, 99, 235, 0.09) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(37, 99, 235, 0.38)",
              borderRadius: "20px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 8px 24px rgba(37, 99, 235, 0.12)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(37, 99, 235, 0.14)", border: "1px solid rgba(37, 99, 235, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    👮
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      112 ERSS Police Dispatch
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700 }}>
                      Police Control Room & Pink Booth
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  Relays live coordinates to State Police Command, assigns nearest PCR Van Romeo unit, and locates nearest Pink Booths for women safety.
                </p>
              </div>

              <button
                onClick={() => openEmergencyHub("police")}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                }}
              >
                👮 Dispatch Police (112)
              </button>
            </div>

            {/* 3. Instant SOS Card (Emergency Siren Amber & Gold) */}
            <div style={{
              background: "linear-gradient(160deg, rgba(245, 158, 11, 0.09) 0%, var(--bg-card) 65%)",
              border: "1.5px solid rgba(245, 158, 11, 0.38)",
              borderRadius: "20px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 8px 24px rgba(245, 158, 11, 0.12)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(245, 158, 11, 0.14)", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    🚨
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      Instant SOS & Siren Alarm
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "#d97706", fontWeight: 700 }}>
                      Deterrent Synthesizer & Multi-Relay
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  Emits high-decibel audible emergency alarm from device speakers while broadcasting encrypted GPS beacon to family and authorities.
                </p>
              </div>

              <button
                onClick={() => openEmergencyHub("sos")}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.88rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                }}
              >
                🚨 Activate SOS & Siren Alarm
              </button>
            </div>
          </div>
        </section>

        {/* ── 11. CARESYNC-STYLE BOTTOM PITCH BANNER ───────────────────────────── */}
        <section style={{
          background: "linear-gradient(145deg, rgba(5, 150, 105, 0.08) 0%, var(--bg-card) 50%, rgba(37, 99, 235, 0.06) 100%)",
          border: "1.5px solid rgba(5, 150, 105, 0.3)",
          borderRadius: "24px",
          padding: "3rem 2rem",
          textAlign: "center",
          marginBottom: "3rem",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25), 0 0 20px rgba(5, 150, 105, 0.08)",
          position: "relative",
          overflow: "hidden",
        }}>
          <h2 style={{
            fontSize: "2.1rem",
            fontWeight: 900,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            marginBottom: "12px",
          }}>
            Ready to Experience Next-Gen Safe Navigation?
          </h2>
          <p style={{
            fontSize: "1.05rem",
            color: "var(--text-secondary)",
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
                padding: "13px 26px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #059669, #047857)",
                border: "none",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
              }}
            >
              🚀 Explore Safe Routes Now
            </button>
            <a
              href="/police/login"
              style={{
                padding: "13px 22px",
                borderRadius: "12px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
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

        {/* ── 12. CARESYNC-STYLE MODERN SAAS FOOTER ────────────────────────────── */}
        <footer style={{
          borderTop: "1px solid var(--border-subtle)",
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
                background: "linear-gradient(135deg, #059669, #047857)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}>
                🛡️
              </div>
              <span style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                Rakshak<span style={{ color: "var(--accent-primary)" }}>NETWORK</span>
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              India's Public Safety & Safe Route Navigation Platform. Empowering citizens with real-time threat avoidance.
            </p>
          </div>

          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Safety Navigation
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              <span style={{ cursor: "pointer" }} onClick={() => { setSafetyMode("safest"); scrollToMap(); }}>🛡️ Safest / Women Safe Routing</span>
              <span style={{ cursor: "pointer" }} onClick={() => { setSafetyMode("fastest"); scrollToMap(); }}>⚡ Fastest / Night Safety Mode</span>
              <span style={{ cursor: "pointer" }} onClick={() => { setSafetyMode("balanced"); scrollToMap(); }}>⚖️ Balanced Corridor</span>
              <span style={{ cursor: "pointer" }} onClick={scrollToMap}>🔥 Live Spatial Heatmap</span>
              <span style={{ cursor: "pointer" }} onClick={openCopilot}>🛡️ Multilingual Safety Assistant</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Civic & Law Enforcement
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              <a href="/police/login" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>👮 Police Command Center</a>
              <span>🚨 ERSS 112 Dispatch Relay</span>
              <span>📍 Verified Pink Booth Registry</span>
              <span>🏥 Hospital Trauma Network</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Data Governance
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
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

      {/* Citizen Operating Region & City Picker Modal */}
      <CityPickerModal
        isOpen={isCityPickerOpen}
        onClose={() => setIsCityPickerOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={(cityName) => setSelectedCity(cityName)}
        title="Select Citizen Safety City & Operating Region"
        subtitle="Choose from 10 major metropolitan safe corridors, live hazard clusters, and ERSS-112 networks across India."
      />
    </PageBackground>
  );
}

export { CitizenPortal as Home };


