"use client";

import React, { useState, useEffect } from "react";
import {
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  MapPin,
  Clock,
  Compass,
  Zap,
  Activity,
  Award,
  ChevronRight,
  Info,
  RotateCcw
} from "lucide-react";
import { api } from "@/lib/api";

interface JourneyControllerProps {
  selectedOrigin?: string;
  selectedDestination?: string;
  onRouteHighlight?: (routeType: string) => void;
}

export const JourneyLifecycleController: React.FC<JourneyControllerProps> = ({
  selectedOrigin = "Connaught Place",
  selectedDestination = "India Gate",
  onRouteHighlight,
}) => {
  // Journey Stages: 'IDLE' | 'PLANNED' | 'IN_PROGRESS' | 'ARRIVED'
  const [stage, setStage] = useState<"IDLE" | "PLANNED" | "IN_PROGRESS" | "ARRIVED">("IDLE");
  const [journeyUUID, setJourneyUUID] = useState<string | null>(null);
  const [routeType, setRouteType] = useState<"Safe" | "Fast" | "Balanced">("Safe");
  const [loading, setLoading] = useState(false);

  // Live telemetry state
  const [currentRisk, setCurrentRisk] = useState<number>(18.0);
  const [riskLevel, setRiskLevel] = useState<string>("Low");
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [deviationsCount, setDeviationsCount] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Pre-journey briefing
  const [briefing, setBriefing] = useState({
    lighting_coverage: "88% Well-lit streetlights",
    police_patrol_density: "3 Stations along perimeter",
    recommended_precautions: "Stick to Main Janpath Rd. High pedestrian density until 22:30."
  });

  // Timer for live journey
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stage === "IN_PROGRESS") {
      interval = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage]);

  // 1. Plan Journey
  const handlePlanJourney = async () => {
    setLoading(true);
    try {
      const res = await api.createJourney({
        start_lat: 28.6304,
        start_lon: 77.2177,
        dest_lat: 28.6129,
        dest_lon: 77.2295,
        start_name: selectedOrigin,
        dest_name: selectedDestination,
        route_type: routeType,
        selected_route: {
          distance_km: 3.8,
          duration_min: 12,
          risk_score: routeType === "Safe" ? 16.5 : routeType === "Balanced" ? 28.0 : 44.0,
          waypoints: [
            [28.6304, 77.2177],
            [28.6250, 77.2210],
            [28.6180, 77.2250],
            [28.6129, 77.2295]
          ]
        },
        safety_briefing: briefing
      });
      setJourneyUUID(res.journey_uuid);
      setStage("PLANNED");
      if (onRouteHighlight) onRouteHighlight(routeType);
    } catch (e) {
      console.error(e);
      // Fallback local UUID for smooth client testing
      const fallbackId = `jny_${Math.random().toString(36).substring(2, 8)}`;
      setJourneyUUID(fallbackId);
      setStage("PLANNED");
    } finally {
      setLoading(false);
    }
  };

  // 2. Start Journey
  const handleStartJourney = async () => {
    if (!journeyUUID) return;
    setLoading(true);
    try {
      await api.startJourney(journeyUUID);
    } catch (e) {
      console.warn("Using offline state transition", e);
    } finally {
      setStage("IN_PROGRESS");
      setElapsedSec(0);
      setDeviationsCount(0);
      setActiveAlert(null);
      setCurrentRisk(routeType === "Safe" ? 16.5 : 32.0);
      setRiskLevel("Low");
      setLoading(false);
    }
  };

  // 3. Simulate Live GPS Telemetry / Deviation
  const handleSimulateGPS = async (deviate: boolean = false) => {
    if (!journeyUUID) return;
    try {
      const lat = deviate ? 28.6200 : 28.6230;
      const lon = deviate ? 77.2400 : 77.2230; // deviate swings 1km east
      const tele = await api.sendJourneyTelemetry(journeyUUID, {
        current_lat: lat,
        current_lon: lon,
        deviation_threshold_km: 0.35
      });
      setCurrentRisk(tele.current_risk);
      setRiskLevel(tele.risk_level);
      setDeviationsCount(tele.deviations_count);
      if (tele.is_deviated) {
        setActiveAlert(`⚠️ Off-Route Detected (+${Math.round(tele.dist_to_route_km * 1000)}m). Dynamic Risk Perimeter recalibrated.`);
      } else {
        setActiveAlert("🟢 On Planned Safe Corridor. Telemetry Nominal.");
      }
    } catch (e) {
      if (deviate) {
        setDeviationsCount((prev) => prev + 1);
        setCurrentRisk(48.5);
        setRiskLevel("Moderate");
        setActiveAlert("⚠️ Off-Route Deviation (+420m). Recalibrating route safely.");
      } else {
        setActiveAlert("🟢 On Planned Safe Corridor. Telemetry Nominal.");
      }
    }
  };

  // 4. Complete Journey
  const handleCompleteJourney = async () => {
    if (!journeyUUID) return;
    setLoading(true);
    try {
      const sum = await api.completeJourney(journeyUUID);
      setSummaryData(sum);
    } catch (e) {
      setSummaryData({
        journey_uuid: journeyUUID,
        start_name: selectedOrigin,
        dest_name: selectedDestination,
        route_type: routeType,
        duration_min: Math.max(1, Math.round(elapsedSec / 60)),
        distance_km: 3.8,
        avg_risk_score: currentRisk,
        safety_rating: deviationsCount === 0 ? "Excellent" : "Good",
        deviations_count: deviationsCount,
        route_adherence_pct: `${Math.max(20, 100 - deviationsCount * 20)}%`,
        alerts_resolved: deviationsCount,
        completed_at: new Date().toISOString(),
        disclaimer: "Historical Risk Indicator, not a safety guarantee."
      });
    } finally {
      setStage("ARRIVED");
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStage("IDLE");
    setJourneyUUID(null);
    setElapsedSec(0);
    setDeviationsCount(0);
    setActiveAlert(null);
    setSummaryData(null);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              Rakshak Active Journey Flow
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Layer 4 Navigation
              </span>
            </h3>
            <p className="text-xs text-slate-400">Complete end-to-end trip state machine & telemetry HUD</p>
          </div>
        </div>

        {/* Stage Badge */}
        <div className="text-xs font-mono px-3 py-1 rounded-full border bg-slate-800/80 border-slate-700 text-slate-300">
          Status: <span className="font-bold text-emerald-400">{stage}</span>
        </div>
      </div>

      {/* STAGE 1: IDLE / CONFIGURATION */}
      {stage === "IDLE" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-400 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Origin
              </span>
              <span className="font-medium text-slate-200">{selectedOrigin}</span>
            </div>
            <div>
              <span className="text-slate-400 flex items-center gap-1 mb-1">
                <Compass className="w-3.5 h-3.5 text-blue-400" /> Destination
              </span>
              <span className="font-medium text-slate-200">{selectedDestination}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Select Corridor Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {(["Safe", "Balanced", "Fast"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRouteType(mode)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-center ${
                    routeType === mode
                      ? "bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-sm"
                      : "bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {mode === "Safe" ? "🛡️ Safest" : mode === "Balanced" ? "⚖️ Balanced" : "⚡ Fastest"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handlePlanJourney}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Synthesizing Safety Briefing..." : "Plan & Generate Pre-Journey Briefing"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STAGE 2: PLANNED (Pre-Journey Briefing) */}
      {stage === "PLANNED" && (
        <div className="space-y-4">
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" /> Pre-Journey Safety Briefing
            </div>
            <p className="text-slate-300 leading-relaxed">{briefing.recommended_precautions}</p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                💡 <span className="text-slate-200">{briefing.lighting_coverage}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                🚔 <span className="text-slate-200">{briefing.police_patrol_density}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartJourney}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" /> Start Journey ({routeType} Route)
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: IN_PROGRESS (Live HUD & Telemetry Simulation) */}
      {stage === "IN_PROGRESS" && (
        <div className="space-y-4">
          {/* Live HUD Banner */}
          <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Elapsed Time</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Live Risk</span>
              <span
                className={`text-sm font-bold font-mono ${
                  currentRisk > 50 ? "text-rose-400" : currentRisk > 30 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {currentRisk.toFixed(1)}/100 ({riskLevel})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Deviations</span>
              <span className="text-sm font-mono font-bold text-indigo-400">{deviationsCount}</span>
            </div>
          </div>

          {/* Active Alert ticker */}
          {activeAlert && (
            <div
              className={`p-2.5 rounded-xl text-xs font-mono border transition-all ${
                activeAlert.includes("⚠️")
                  ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {activeAlert}
            </div>
          )}

          {/* Real-time Telemetry Controls */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block">Simulate GPS Updates</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSimulateGPS(false)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-[11px] rounded-lg font-medium transition-all"
              >
                📍 Ping Along Route
              </button>
              <button
                type="button"
                onClick={() => handleSimulateGPS(true)}
                className="py-2 px-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/40 text-[11px] rounded-lg font-medium transition-all"
              >
                ⚠️ Trigger +400m Deviation
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompleteJourney}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Reach Destination (Complete Trip)
          </button>
        </div>
      )}

      {/* STAGE 4: ARRIVED (Post-Journey Safety Summary) */}
      {stage === "ARRIVED" && summaryData && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900/80 border border-emerald-500/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Journey Completed Safely
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Grade: {summaryData.safety_rating}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Duration</span>
                <span className="font-bold text-slate-200">{summaryData.duration_min} min</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Distance</span>
                <span className="font-bold text-slate-200">{summaryData.distance_km} km</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Route Adherence</span>
                <span className="font-bold text-emerald-400">{summaryData.route_adherence_pct}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic text-center">
              "{summaryData.disclaimer || "Historical Risk Indicator, not a safety guarantee."}"
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Plan Another Journey
          </button>
        </div>
      )}
    </div>
  );
};
