"use client";

import React from "react";
import { RouteCalculateResponse } from "./types";

export interface RouteSummaryProps {
  route: RouteCalculateResponse;
  className?: string;
}

export const RouteSummary: React.FC<RouteSummaryProps> = ({ route, className = "" }) => {
  const formattedDuration = `${Math.round(route.duration)} mins`;
  const formattedETA = route.eta_formatted || (route.eta ? new Date(route.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A");

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "12px",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        border: "1px solid #334155",
      }}
      className={className}
    >
      <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "bold" }}>
        Route Summary
      </h4>
      <div style={{ display: "flex", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Distance</div>
          <div style={{ fontSize: "18px", fontWeight: "bold" }}>{route.distance} km</div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Travel Time</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f59e0b" }}>
            {formattedDuration}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>ETA</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#38bdf8" }}>
            {formattedETA}
          </div>
        </div>
      </div>
    </div>
  );
};
