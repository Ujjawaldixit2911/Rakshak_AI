"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface WhatIfSimulatorProps {
  origin: string;
  destination: string;
  city: string;
}

export default function WhatIfSimulator({
  origin,
  destination,
  city,
}: WhatIfSimulatorProps) {
  const [selectedTime, setSelectedTime] = useState<"Morning" | "Evening" | "Night">("Night");
  const [selectedMode, setSelectedMode] = useState<"safest" | "fastest">("safest");
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<any | null>(null);

  useEffect(() => {
    const fetchSimulation = async () => {
      setLoading(true);
      try {
        const res = await api.runWhatIfSimulation({
          origin: origin || "Connaught Place",
          destination: destination || "Saket",
          city,
          times: ["Morning", "Evening", "Night"],
          modes: ["safest", "fastest"],
        });
        setSimulationData(res);
      } catch (e) {
        console.error("Failed to run What-If Simulation:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSimulation();
  }, [origin, destination, city]);

  const scenarios = simulationData?.scenarios || [];
  const currentScenario = scenarios.find(
    (s: any) => s.time_of_day === selectedTime && s.mode === selectedMode
  ) || scenarios[0];

  const compareScenario = scenarios.find(
    (s: any) => s.time_of_day === "Evening" && s.mode === "safest"
  ) || scenarios[0];

  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))",
        border: "1px solid rgba(79, 124, 255, 0.25)",
        borderRadius: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.2rem" }}>🧪</span>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#f8fafc" }}>
              What-If Safety Simulator (Departure & Mode Comparison)
            </h3>
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
            Real-time trade-off evaluation: Departure Hour vs. Route Risk Penalty
          </span>
        </div>

        <span
          style={{
            padding: "3px 8px",
            background: "rgba(79, 124, 255, 0.15)",
            border: "1px solid rgba(79, 124, 255, 0.3)",
            borderRadius: "6px",
            fontSize: "0.72rem",
            color: "#93c5fd",
            fontWeight: 700,
          }}
        >
          MODULE 2: SMART NAVIGATION
        </span>
      </div>

      {/* Simulator Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1rem" }}>
        <div>
          <label style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
            🕒 Simulated Departure Time
          </label>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["Morning", "Evening", "Night"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  borderRadius: "6px",
                  border: "none",
                  background: selectedTime === t ? "#6366f1" : "rgba(255, 255, 255, 0.05)",
                  color: selectedTime === t ? "#fff" : "#94a3b8",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
            🛡️ Algorithm Mode
          </label>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["safest", "fastest"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMode(m)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  borderRadius: "6px",
                  border: "none",
                  background: selectedMode === m ? (m === "safest" ? "#10b981" : "#3b82f6") : "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {m === "safest" ? "🛡️ Safest Corridor" : "⚡ Fastest Path"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      {loading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
          Calculating simulated scenario physics...
        </div>
      ) : currentScenario ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* Selected Scenario Card */}
          <div
            style={{
              padding: "12px",
              background: "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${currentScenario.rakshak_safety_score >= 80 ? "#22c55e" : currentScenario.rakshak_safety_score >= 60 ? "#f59e0b" : "#ef4444"}`,
              borderRadius: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700 }}>
                {selectedTime.toUpperCase()} ({selectedMode.toUpperCase()})
              </span>
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: currentScenario.rakshak_safety_score >= 80 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  color: currentScenario.rakshak_safety_score >= 80 ? "#86efac" : "#fca5a5",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                }}
              >
                {currentScenario.risk_exposure} RISK
              </span>
            </div>

            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: currentScenario.rakshak_safety_score >= 80 ? "#22c55e" : currentScenario.rakshak_safety_score >= 60 ? "#f59e0b" : "#ef4444", marginBottom: 4 }}>
              {currentScenario.rakshak_safety_score} <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>/ 100</span>
            </div>

            <div style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
              ⏱️ {currentScenario.travel_time_minutes} mins · 🛣️ {currentScenario.distance_km} km
            </div>
          </div>

          {/* Baseline Comparison Delta Card */}
          <div
            style={{
              padding: "12px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
            }}
          >
            <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: 6 }}>
              📊 SAFETY DELTA COMPARISON
            </span>

            <div style={{ fontSize: "0.82rem", color: "#f1f5f9", lineHeight: 1.4, marginBottom: 6 }}>
              {selectedTime === "Night" ? (
                <span>
                  🌙 <strong>Night Commute Impact:</strong> Safety score is{" "}
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>
                    {roundDelta(compareScenario.rakshak_safety_score - currentScenario.rakshak_safety_score)} pts lower
                  </span>{" "}
                  than daylight due to reduced ambient lighting & transit frequency.
                </span>
              ) : (
                <span>
                  ☀️ <strong>Daylight Advantage:</strong> High commercial footfall and frequent bus transit keeps safety score elevated.
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              💡 <em>Historical risk indicator based on verified incident data.</em>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function roundDelta(num: number): string {
  return Math.abs(num).toFixed(1);
}
