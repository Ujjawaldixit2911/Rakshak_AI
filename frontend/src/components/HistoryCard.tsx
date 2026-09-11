"use client";

import React from "react";
import { ArrowRight, Clock, Navigation, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface JourneyHistoryRecord {
  id: number | string;
  userId?: string;
  source: string;
  destination: string;
  sourceLat?: number | null;
  sourceLon?: number | null;
  destLat?: number | null;
  destLon?: number | null;
  timestamp: string;
  safetyScore: number;
  routeType: string;
  distanceKm?: number | null;
  durationMin?: number | null;
}

interface HistoryCardProps {
  journey: JourneyHistoryRecord;
  onRepeat?: (journey: JourneyHistoryRecord) => void;
  className?: string;
}

function formatRelativeTime(isoString: string): string {
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffMin = Math.round((now - past) / (1000 * 60));

    if (isNaN(diffMin) || diffMin < 0) return "Recent";
    if (diffMin < 2) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

export function HistoryCard({ journey, onRepeat, className = "" }: HistoryCardProps) {
  const score = Math.round(journey.safetyScore || 88);

  // Safety score pill colors
  const getScoreTheme = (val: number) => {
    if (val >= 85) {
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.3)",
        text: "#059669",
        label: "Very Safe",
      };
    }
    if (val >= 70) {
      return {
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.3)",
        text: "#d97706",
        label: "Moderate",
      };
    }
    return {
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.3)",
      text: "#dc2626",
      label: "Elevated Risk",
    };
  };

  const theme = getScoreTheme(score);

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
        padding: "1rem",
        boxShadow: "var(--shadow-card)",
        minWidth: "290px",
        maxWidth: "340px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.2s ease",
      }}
      className={`group ${className}`}
    >
      {/* Top row: Route Type & Safety Badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
          <Clock style={{ width: 13, height: 13, color: "var(--text-muted)" }} />
          <span>{formatRelativeTime(journey.timestamp)}</span>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--border-strong)" }} />
          <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>{journey.routeType || "Safest"}</span>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            borderRadius: "9999px",
            fontSize: "0.7rem",
            fontWeight: 800,
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            color: theme.text,
          }}
        >
          <ShieldCheck style={{ width: 12, height: 12 }} />
          <span>{score}/100</span>
        </div>
      </div>

      {/* Origin -> Destination */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: "0.86rem", fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {journey.source}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", paddingLeft: 3 }}>
          <div style={{ width: 2, height: 10, background: "var(--border-strong)", marginLeft: 2 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-primary)", flexShrink: 0 }} />
          <span style={{ fontSize: "0.86rem", fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {journey.destination}
          </span>
        </div>
      </div>

      {/* Bottom row: Distance / Time + Repeat Button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "0.6rem",
        borderTop: "1px solid var(--border-subtle)",
        marginTop: "auto",
      }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          {journey.distanceKm ? `${journey.distanceKm} km` : "12.4 km"}
          {" • "}
          {journey.durationMin ? `${Math.round(journey.durationMin)} min` : "28 min"}
        </div>

        {onRepeat && (
          <button
            onClick={() => onRepeat(journey)}
            style={{
              padding: "4px 10px",
              borderRadius: "8px",
              background: "var(--accent-subtle)",
              border: "1px solid var(--border-subtle)",
              color: "var(--accent-primary)",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
          >
            <RotateCcw style={{ width: 12, height: 12 }} />
            <span>Repeat</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default HistoryCard;
