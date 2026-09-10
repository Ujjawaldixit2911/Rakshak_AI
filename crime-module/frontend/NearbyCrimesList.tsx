"use client";

import React from "react";
import { NearbyCrime } from "./types";

export interface NearbyCrimesListProps {
  crimes: NearbyCrime[];
  className?: string;
}

const severityBadgeStyle: Record<string, { bg: string; color: string; border: string }> = {
  high: { bg: "#450a0a", color: "#f87171", border: "#ef4444" },
  medium: { bg: "#451a03", color: "#fbbf24", border: "#f59e0b" },
  low: { bg: "#064e3b", color: "#34d399", border: "#10b981" },
};

export const NearbyCrimesList: React.FC<NearbyCrimesListProps> = ({ crimes, className = "" }) => {
  if (!crimes || crimes.length === 0) {
    return (
      <div style={{ padding: "16px", color: "#94a3b8", fontSize: "13px" }} className={className}>
        No crime incidents found within this radius.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className={className}>
      {crimes.map((crime) => {
        const badge = severityBadgeStyle[crime.severity] || severityBadgeStyle.medium;
        return (
          <div
            key={crime.id}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: "#0f172a",
              border: "1px solid #1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc" }}>
                  {crime.crimeType}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    backgroundColor: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    fontWeight: 700,
                  }}
                >
                  {crime.severity}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                📍 {crime.location} • {crime.date} {crime.time ? `at ${crime.time}` : ""}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#38bdf8" }}>
                {crime.distanceKm} km
              </span>
              <div style={{ fontSize: "9px", color: "#64748b" }}>away</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
