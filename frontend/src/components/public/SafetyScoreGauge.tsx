"use client";
import { useMemo } from "react";
import type { SafetyScore } from "@/lib/api";

interface Props { data: SafetyScore; size?: number; }

export default function SafetyScoreGauge({ data, size = 160 }: Props) {
  const { score, classification, color, total_crimes } = data;
  const r = (size / 2) - 14;
  const circ = 2 * Math.PI * r;
  // Arc covers 75% of circle (270°)
  const arcLen = circ * 0.75;
  const fillLen = (score / 100) * arcLen;
  const dashOffset = arcLen - fillLen;

  const strokeColor = useMemo(() => {
    if (score >= 70) return "#22c55e";
    if (score >= 45) return "#f59e0b";
    return "#ef4444";
  }, [score]);

  const badgeClass = useMemo(() => {
    if (classification === "Safe") return "badge badge-safe";
    if (classification === "Moderate") return "badge badge-moderate";
    return "badge badge-critical";
  }, [classification]);

  const cx = size / 2, cy = size / 2;
  // Start at 135° (bottom-left), sweep 270° clockwise
  const startAngle = 135 * (Math.PI / 180);
  const sx = cx + r * Math.cos(startAngle);
  const sy = cy + r * Math.sin(startAngle);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(0deg)" }}>
          {/* Track arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={10}
            strokeDasharray={`${arcLen} ${circ - arcLen}`}
            strokeDashoffset={-circ * 0.125}
            strokeLinecap="round"
          />
          {/* Fill arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={10}
            strokeDasharray={`${fillLen} ${circ - fillLen}`}
            strokeDashoffset={-circ * 0.125}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${strokeColor}88)`,
              transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        {/* Center label */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 2,
        }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 800, color: strokeColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(score)}
          </span>
          <span style={{ fontSize: size * 0.085, color: "rgba(136,153,187,0.9)", fontWeight: 500 }}>/ 100</span>
        </div>
      </div>

      <span className={badgeClass} style={{ fontSize: "0.78rem" }}>
        {classification === "Safe" ? "✓" : classification === "Moderate" ? "⚠" : "⚡"} {classification}
      </span>
      <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
        {total_crimes.toLocaleString()} total incidents
      </span>
    </div>
  );
}
