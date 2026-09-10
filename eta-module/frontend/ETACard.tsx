"use client";

import React from "react";
import { ETACalculateResponse } from "./types";

export interface ETACardProps {
  eta: ETACalculateResponse;
  className?: string;
}

export const ETACard: React.FC<ETACardProps> = ({ eta, className = "" }) => {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: "12px",
        backgroundColor: "#090d16",
        border: "1px solid #1e293b",
        color: "#f8fafc",
        display: "inline-flex",
        alignItems: "center",
        gap: "16px",
      }}
      className={className}
    >
      <div>
        <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
          Arrival Time (ETA)
        </div>
        <div style={{ fontSize: "20px", fontWeight: 800, color: "#38bdf8" }}>
          {eta.eta_formatted}
        </div>
      </div>
      <div style={{ borderLeft: "1px solid #334155", paddingLeft: "16px" }}>
        <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
          Remaining
        </div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#f59e0b" }}>
          {eta.formatted_duration}
        </div>
      </div>
    </div>
  );
};
