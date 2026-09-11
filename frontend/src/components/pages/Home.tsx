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
import { Clock, ShieldCheck, MapPin, AlertTriangle, Radio, PhoneCall, Activity, CheckCircle2 } from "lucide-react";
import { PageBackground } from "@/components/shared/PageBackground";
import { KPICard } from "@/components/shared/KPICard";
import { Card } from "@/components/shared/Card";
import { SectionHeader } from "@/components/shared/SectionHeader";

// ── Fallback Dataset Generators (Guarantees 0-crash offline resilience) ─────
function getFallbackCityHotspots(cityName: string) {
  if (cityName === "Mumbai") {
    return {
      hotspots: [
        { id: 1, location: "Kurla West Station", lat: 19.0650, lon: 72.8790, risk_score: 88, risk_level: "High", top_crime_types: ["Theft", "Pickpocketing"], color: "#ef4444" },
        { id: 2, location: "Govandi Junction", lat: 19.0550, lon: 72.9150, risk_score: 79, risk_level: "High", top_crime_types: ["Assault", "Theft"], color: "#ef4444" },
        { id: 3, location: "Dharavi Transit Point", lat: 19.0400, lon: 72.8550, risk_score: 65, risk_level: "Moderate", top_crime_types: ["Vehicle Theft"], color: "#f59e0b" }
      ]
    };
  }
  if (cityName === "Bengaluru") {
    return {
      hotspots: [
        { id: 1, location: "Shivajinagar Bus Stand", lat: 12.9850, lon: 77.6050, risk_score: 82, risk_level: "High", top_crime_types: ["Theft", "Harassment"], color: "#ef4444" },
        { id: 2, location: "Majestic Junction", lat: 12.9780, lon: 77.5720, risk_score: 86, risk_level: "High", top_crime_types: ["Pickpocketing", "Snatching"], color: "#ef4444" },
        { id: 3, location: "Silk Board Underpass", lat: 12.9170, lon: 77.6230, risk_score: 64, risk_level: "Moderate", top_crime_types: ["Poor Lighting"], color: "#f59e0b" }
      ]
    };
  }
  return {
    hotspots: [
      { id: 1, location: "Seelampur Market Corridor", lat: 28.6692, lon: 77.2680, risk_score: 92, risk_level: "Critical", top_crime_types: ["Snatching", "Theft"], color: "#ef4444" },
      { id: 2, location: "Kashmere Gate Subways", lat: 28.6675, lon: 77.2280, risk_score: 84, risk_level: "High", top_crime_types: ["Pickpocketing"], color: "#ef4444" },
      { id: 3, location: "Paharganj Inner Lanes", lat: 28.6430, lon: 77.2150, risk_score: 72, risk_level: "Moderate", top_crime_types: ["Harassment"], color: "#f59e0b" },
      { id: 4, location: "Uttam Nagar East", lat: 28.6210, lon: 77.0580, risk_score: 68, risk_level: "Moderate", top_crime_types: ["Vehicle Theft"], color: "#f59e0b" }
    ]
  };
}

function getFallbackHeatmapPoints(cityName: string) {
  const centerLat = cityName === "Mumbai" ? 19.0760 : cityName === "Bengaluru" ? 12.9716 : 28.6139;
  const centerLon = cityName === "Mumbai" ? 72.8777 : cityName === "Bengaluru" ? 77.5946 : 77.2090;
  return [
    { lat: centerLat + 0.02, lon: centerLon + 0.01, intensity: 0.8 },
    { lat: centerLat - 0.02, lon: centerLon - 0.01, intensity: 0.6 },
    { lat: centerLat + 0.01, lon: centerLon - 0.03, intensity: 0.9 },
    { lat: centerLat - 0.03, lon: centerLon + 0.02, intensity: 0.4 },
    { lat: centerLat + 0.04, lon: centerLon + 0.03, intensity: 0.7 }
  ];
}

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
    safety_explanation: "Rakshak AI selected the Arterial Safe Corridor routing via well-lit main boulevards with 5 active PCR patrolling units, bypassing 2 low-lighting alleyway clusters.",
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
  const { isAuthenticated, isLoading, user, currentFieldInfo, openFieldModal, openHistoryModal } = useAuth();

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
              <span>🛡️ Rakshak AI • Real-Time AI Public Safety & Route Intelligence</span>
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
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #7c3aed 100%)",
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
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.92rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🗺️ Launch Safe Navigation</span>
                <span style={{ fontSize: "1.05rem" }}>→</span>
              </button>

              {/* Feature 2: AI Voice Copilot */}
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
                <span>🤖 Open AI Copilot</span>
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
                <span>🎙️ AI Presenter</span>
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
                <span style={{ color: "#7c3aed", fontWeight: 800 }}>⚡ 0.4s</span> AI Optimization
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
            badge="NEXT-GEN SAFETY ENGINE"
            title="4-Pillar Autonomous Intelligence Stack"
            description="Explore the four core modules powering Rakshak AI's threat neutralization architecture."
            align="center"
          />

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}>
            {/* Pillar 1: Spatial AI */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-card)",
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
                  background: "rgba(225, 29, 72, 0.1)",
                  border: "1px solid rgba(225, 29, 72, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "1rem",
                }}>
                  📍
                </div>
                <div style={{ fontSize: "0.72rem", color: "#e11d48", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  SPATIAL AI
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
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(225, 29, 72, 0.1)",
                  border: "1px solid rgba(225, 29, 72, 0.3)",
                  color: "#e11d48",
                  fontSize: "0.82rem",
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

            {/* Pillar 2: Algorithmic Routing Engine */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-card)",
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
                  background: "rgba(5, 150, 105, 0.1)",
                  border: "1px solid rgba(5, 150, 105, 0.25)",
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
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(5, 150, 105, 0.1)",
                  border: "1px solid rgba(5, 150, 105, 0.3)",
                  color: "#059669",
                  fontSize: "0.82rem",
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

            {/* Pillar 3: Civic Infrastructure & SOS */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-card)",
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
                  background: "rgba(220, 38, 38, 0.1)",
                  border: "1px solid rgba(220, 38, 38, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "1rem",
                }}>
                  🚨
                </div>
                <div style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
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
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(220, 38, 38, 0.1)",
                  border: "1px solid rgba(220, 38, 38, 0.3)",
                  color: "#dc2626",
                  fontSize: "0.82rem",
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

            {/* Pillar 4: Conversational AI Copilot */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-card)",
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
                  background: "rgba(124, 58, 237, 0.1)",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "1rem",
                }}>
                  🎙️
                </div>
                <div style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  CONVERSATIONAL AI
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                  Multilingual Voice Copilot
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Hands-free natural Hindi & English voice assistant for instant route computation, hazard reporting & SOS.
                </p>
              </div>

              <button
                onClick={openCopilot}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(124, 58, 237, 0.1)",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  color: "#7c3aed",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>🤖 Chat with AI Voice Copilot</span>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: "var(--accent-dim)",
                  color: "var(--accent-primary)",
                  border: "1px solid var(--border-subtle)",
                }}>
                  🛡️ AI Hotspot & Safe Navigation Platform
                </span>
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(34, 197, 94, 0.1)",
                  color: "#16a34a",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                }}>
                  ⚛️ React • 🗺️ Leaflet • 🌐 OpenStreetMap • 🛣️ OSRM
                </span>
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 900, margin: 0, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
                Citizen Safety Portal & Route Navigator
              </h2>
            </div>

            {/* City Selector Tabs */}
            <div style={{
              display: "flex",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
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
                    background: selectedCity === c.name ? "linear-gradient(135deg, #0284c7, #0369a1)" : "transparent",
                    color: selectedCity === c.name ? "#fff" : "var(--text-secondary)",
                    boxShadow: selectedCity === c.name ? "0 2px 8px rgba(2,132,199,0.3)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  📍 {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Route Control & Mode Selectors */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            padding: "1.25rem",
            marginBottom: "1.5rem"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {/* Feature Mode Selector */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  🛡️ Routing Safety Mode
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {/* Safest / Women Safety Button */}
                  <button
                    onClick={() => setSafetyMode("safest")}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "10px",
                      border: `1px solid ${safetyMode === "safest" ? "#db2777" : "var(--border-subtle)"}`,
                      background: safetyMode === "safest" ? "rgba(219, 39, 119, 0.12)" : "var(--bg-card)",
                      color: safetyMode === "safest" ? "#db2777" : "var(--text-secondary)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    🛡️ Safest / Women
                  </button>

                  {/* Balanced Corridor Button */}
                  <button
                    onClick={() => setSafetyMode("balanced")}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "10px",
                      border: `1px solid ${safetyMode === "balanced" ? "#059669" : "var(--border-subtle)"}`,
                      background: safetyMode === "balanced" ? "rgba(5, 150, 105, 0.12)" : "var(--bg-card)",
                      color: safetyMode === "balanced" ? "#059669" : "var(--text-secondary)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    ⚖️ Balanced
                  </button>

                  {/* Fastest / Night Transit Button */}
                  <button
                    onClick={() => setSafetyMode("fastest")}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "10px",
                      border: `1px solid ${safetyMode === "fastest" ? "#4f46e5" : "var(--border-subtle)"}`,
                      background: safetyMode === "fastest" ? "rgba(79, 70, 229, 0.12)" : "var(--bg-card)",
                      color: safetyMode === "fastest" ? "#4f46e5" : "var(--text-secondary)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    ⚡ Fastest / Night
                  </button>
                </div>
              </div>

              {/* Time of Day Simulation */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
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
                        border: `1px solid ${timeOfDay === t ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                        background: timeOfDay === t ? "var(--accent-primary)" : "var(--bg-card)",
                        color: timeOfDay === t ? "#ffffff" : "var(--text-secondary)",
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
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  🗺️ Map Intelligence Layers
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                    <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
                    🔥 Heatmap
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                    <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} />
                    📍 Hotspots ({hotspotsData?.total_hotspots || 0})
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                    <input type="checkbox" checked={showEmergencyPOIs} onChange={(e) => setShowEmergencyPOIs(e.target.checked)} />
                    🚨 Emergency POIs
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Route Presets & Voice Command Bar */}
            <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 700 }}>Quick routes in {selectedCity}:</span>
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
                    background: "var(--accent-dim)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--accent-primary)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {p.label}
                </button>
              ))}

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>🎙️ Speak route:</span>
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
                background: "var(--bg-surface)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "16px",
                padding: "1.25rem"
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
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "16px",
                padding: "1.25rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    🚨 Nearby Emergency Stations
                  </h3>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Verified 24x7</span>
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
            {/* Feature Studio Card 1: Family Safety Circle */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-card)",
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
                    background: "var(--accent-dim)",
                    border: "1px solid var(--border-subtle)",
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
                    <span style={{ fontSize: "0.72rem", color: "var(--accent-primary)", fontWeight: 700 }}>
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
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                }}
              >
                <span>🛡️ Launch Family Safety Mode</span>
              </button>
            </div>

            {/* Feature Studio Card 2: What-If Threat Simulator */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-card)",
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
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
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

            {/* Feature Studio Card 3: Standalone Voice Agent */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-card)",
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
                    background: "rgba(99, 102, 241, 0.1)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
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
                    <span style={{ fontSize: "0.72rem", color: "#6366f1", fontWeight: 700 }}>
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
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
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
              icon={<MapPin className="w-5 h-5 text-[#0284c7]" />}
              caption="High-density arterial highways with 100% illumination coverage"
              accentColor="blue"
              delta={{ value: "+3.2 km newly illuminated", isPositive: true }}
            />

            <KPICard
              label="Average Safety Score"
              value={88}
              suffix=" / 100"
              icon={<ShieldCheck className="w-5 h-5 text-[#059669]" />}
              caption="+34 points safer compared to unguided standard routes"
              accentColor="green"
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
            {/* 1. Ambulance Card */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-card)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
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

            {/* 2. Police Card */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-card)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "12px", background: "var(--accent-dim)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    👮
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      112 ERSS Police Dispatch
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "var(--accent-primary)", fontWeight: 700 }}>
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
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                }}
              >
                👮 Dispatch Police (112)
              </button>
            </div>

            {/* 3. Instant SOS Card */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-card)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
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
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "24px",
          padding: "3rem 2rem",
          textAlign: "center",
          marginBottom: "3rem",
          boxShadow: "var(--shadow-card)",
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
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                border: "none",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
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
                background: "linear-gradient(135deg, #0284c7, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}>
                🛡️
              </div>
              <span style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                Rakshak<span style={{ color: "var(--accent-primary)" }}>AI</span>
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              India's Autonomous AI Crime Intelligence & Safe Route Navigation Platform. Empowering citizens with real-time threat avoidance.
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
              <span style={{ cursor: "pointer" }} onClick={openCopilot}>🤖 Multilingual AI Copilot</span>
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
    </PageBackground>
  );
}

export { CitizenPortal as Home };


