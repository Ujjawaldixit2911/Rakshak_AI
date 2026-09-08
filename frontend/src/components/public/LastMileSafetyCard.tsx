"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface LastMileSafetyCardProps {
  origin: string;
  destination: string;
  city: string;
}

export default function LastMileSafetyCard({
  origin,
  destination,
  city,
}: LastMileSafetyCardProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLastMile = async () => {
      setLoading(true);
      try {
        const res = await api.getLastMileAnalysis({
          origin: origin || "Connaught Place",
          destination: destination || "Saket",
          city,
          time_of_day: "Night",
        });
        setData(res);
      } catch (e) {
        console.error("Failed to load last mile analysis:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLastMile();
  }, [origin, destination, city]);

  if (loading) return null;
  if (!data || !data.segments) return null;

  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.2rem" }}>🚶</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>
              Last-Mile Safety Dissection (Walk → Transit → Walk)
            </h3>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              Isolates the final 500m walk from destination
            </span>
          </div>
        </div>

        <span
          style={{
            padding: "2px 8px",
            borderRadius: "6px",
            background: data.last_mile_critical_alert ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
            color: data.last_mile_critical_alert ? "#f87171" : "#4ade80",
            fontSize: "0.72rem",
            fontWeight: 700,
          }}
        >
          {data.last_mile_critical_alert ? "⚠️ CRITICAL LAST-MILE ALERT" : "✓ SAFE LAST-MILE"}
        </span>
      </div>

      {/* Segments Visual Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "12px" }}>
        {data.segments.map((seg: any, idx: number) => (
          <div
            key={idx}
            style={{
              padding: "12px",
              background: seg.type === "last_mile_walk" ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
              border: `1px solid ${seg.type === "last_mile_walk" ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.06)"}`,
              borderRadius: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8" }}>
                LEG {idx + 1} ({seg.distance_approx})
              </span>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: seg.rakshak_safety_score >= 80 ? "#22c55e" : seg.rakshak_safety_score >= 60 ? "#f59e0b" : "#ef4444" }}>
                {seg.rakshak_safety_score} / 100
              </span>
            </div>

            <h4 style={{ margin: "0 0 6px 0", fontSize: "0.82rem", color: "#f1f5f9" }}>
              {seg.segment_name}
            </h4>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>
              💡 Illumination: {seg.lighting_index}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#cbd5e1", lineHeight: 1.3 }}>
              {seg.safety_tip}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "8px 12px",
          background: "rgba(255, 255, 255, 0.04)",
          borderRadius: "8px",
          fontSize: "0.74rem",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>ℹ️</span>
        <span>
          <strong>Why this matters:</strong> Even if highway transit is safe, final walk-through inner colony gates or dark service lanes represents 70% of night-time vulnerabilities.
        </span>
      </div>
    </div>
  );
}
