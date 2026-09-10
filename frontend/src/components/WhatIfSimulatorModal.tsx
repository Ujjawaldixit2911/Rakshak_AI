"use client";

import React, { useState } from "react";
import { Sliders, Moon, Sun, CloudRain, Shield, AlertTriangle, ArrowRight, Activity, Zap, RefreshCw, X, Car, Footprints, Bus } from "lucide-react";

interface WhatIfSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
  onApplySimulatedRoute?: (route: any) => void;
}

export default function WhatIfSimulatorModal({
  isOpen,
  onClose,
  sourceCoords = { lat: 28.6692, lng: 77.4538 }, // Default Ghaziabad
  destCoords = { lat: 28.5355, lng: 77.3910 },   // Default Noida
  onApplySimulatedRoute,
}: WhatIfSimulatorModalProps) {
  const [timeBucket, setTimeBucket] = useState<"day" | "evening" | "late_night" | "deep_night">("late_night");
  const [travelMode, setTravelMode] = useState<"driving" | "solo_cab" | "transit" | "walking">("walking");
  const [lighting, setLighting] = useState<"well_lit" | "moderate" | "poor">("poor");
  const [weather, setWeather] = useState<"clear" | "rain" | "heavy_rain" | "fog">("heavy_rain");
  const [policePatrol, setPolicePatrol] = useState<"standard" | "enhanced" | "reduced">("standard");

  const [isLoading, setIsLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const timeBucketToIso = (bucket: string) => {
    switch (bucket) {
      case "day":
        return "2026-09-11T14:00:00+05:30";
      case "evening":
        return "2026-09-11T20:30:00+05:30";
      case "late_night":
        return "2026-09-11T23:45:00+05:30";
      case "deep_night":
        return "2026-09-12T02:30:00+05:30";
      default:
        return "2026-09-11T23:30:00+05:30";
    }
  };

  const runSimulation = async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const payload = {
        source: sourceCoords,
        destination: destCoords,
        scenario: {
          departureTime: timeBucketToIso(timeBucket),
          travelMode: travelMode,
          lightingCondition: lighting,
          weatherCondition: weather,
          policePatrol: policePatrol,
        },
      };

      const res = await fetch(`${backendUrl}/api/simulator/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Simulation failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      setSimResult(data);
    } catch (err: any) {
      console.error("Simulation error:", err);
      setErrorMsg(err.message || "Failed to execute simulation.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 shadow-md">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide">What-If Safety Simulator</h2>
              <p className="text-xs text-slate-400">Dynamic Multi-Factor Journey Stress-Testing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Simulation Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Time of Day */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Departure Time of Day</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: "day", label: "☀️ Daytime (14:00)" },
                  { id: "evening", label: "🌆 Evening (20:30)" },
                  { id: "late_night", label: "🌙 Late Night (23:45)" },
                  { id: "deep_night", label: "🌌 Deep Night (02:30)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTimeBucket(item.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-left transition ${
                      timeBucket === item.id
                        ? "bg-indigo-600 border-indigo-500 text-white font-semibold shadow"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Travel Mode */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Car className="w-4 h-4 text-emerald-400" />
                <span>Travel Mode</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: "driving", label: "🚗 Driving" },
                  { id: "solo_cab", label: "🚕 Solo Cab" },
                  { id: "transit", label: "🚌 Public Transit" },
                  { id: "walking", label: "🚶 Walking (Solo)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTravelMode(item.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-left transition ${
                      travelMode === item.id
                        ? "bg-emerald-600 border-emerald-500 text-white font-semibold shadow"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Street Lighting */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Street Illumination</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: "well_lit", label: "💡 Well-Lit" },
                  { id: "moderate", label: "⚡ Moderate" },
                  { id: "poor", label: "🌑 Poor/Dark" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLighting(item.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition ${
                      lighting === item.id
                        ? "bg-amber-600 border-amber-500 text-white font-semibold shadow"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Weather & Police Presence */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                <span>Weather & Visibility</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: "clear", label: "☀️ Clear" },
                  { id: "rain", label: "🌧️ Rain" },
                  { id: "heavy_rain", label: "⛈️ Heavy Storm" },
                  { id: "fog", label: "🌫️ Dense Fog" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setWeather(item.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-left transition ${
                      weather === item.id
                        ? "bg-cyan-600 border-cyan-500 text-white font-semibold shadow"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={runSimulation}
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Safety Scores & Route Physics...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Simulate Scenario Impact</span>
              </>
            )}
          </button>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-3 text-red-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Simulation Output Dashboard */}
          {simResult && (
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 space-y-4 shadow-xl">
              {/* Score Comparison Gauge Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Baseline Score</span>
                  <span className="text-2xl font-black text-slate-200">{simResult.baselineScore}</span>
                  <span className="text-[10px] text-slate-400 block">Daytime Baseline</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Simulated Score</span>
                  <span
                    className={`text-2xl font-black ${
                      simResult.simulatedScore >= 75
                        ? "text-emerald-400"
                        : simResult.simulatedScore >= 50
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {simResult.simulatedScore}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{simResult.simulatedBand} Risk Band</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Score Delta</span>
                  <span
                    className={`text-2xl font-black ${
                      simResult.scoreDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {simResult.scoreDelta >= 0 ? `+${simResult.scoreDelta}` : simResult.scoreDelta}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{simResult.percentageChange}% change</span>
                </div>
              </div>

              {/* Factors Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Factor Contributions</h4>
                <div className="space-y-1.5">
                  {simResult.factors.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800"
                    >
                      <span className="text-slate-300">{f.factor}: <strong className="text-slate-100">{f.selectedOption}</strong></span>
                      <span
                        className={`font-semibold ${
                          f.impactPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {f.impactPercent >= 0 ? `+${f.impactPercent}%` : `${f.impactPercent}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable AI Guidance */}
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 space-y-1 text-xs">
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Simulator AI Recommendation</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{simResult.aiRecommendation}</p>
              </div>

              {/* Apply to Map if routes attached */}
              {simResult.simulatedRoutes && onApplySimulatedRoute && (
                <button
                  onClick={() => {
                    onApplySimulatedRoute(simResult.simulatedRoutes);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                >
                  Apply Simulated Routes to Live Map
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
