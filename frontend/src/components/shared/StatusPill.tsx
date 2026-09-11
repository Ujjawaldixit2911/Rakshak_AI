"use client";

import React from "react";

export type StatusVariant =
  | "safe"
  | "moderate"
  | "high"
  | "critical"
  | "primary"
  | "neutral";

interface StatusPillProps {
  label: string;
  variant?: StatusVariant;
  icon?: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export function StatusPill({
  label,
  variant = "primary",
  icon,
  dot = false,
  className = "",
}: StatusPillProps) {
  const getStyles = () => {
    switch (variant) {
      case "safe":
        return {
          bg: "var(--color-safe-bg)",
          text: "var(--color-safe)",
          border: "rgba(16, 185, 129, 0.25)",
        };
      case "moderate":
        return {
          bg: "var(--color-moderate-bg)",
          text: "var(--color-moderate)",
          border: "rgba(245, 158, 11, 0.25)",
        };
      case "high":
        return {
          bg: "var(--color-high-bg)",
          text: "var(--color-high)",
          border: "rgba(249, 115, 22, 0.25)",
        };
      case "critical":
        return {
          bg: "var(--color-critical-bg)",
          text: "var(--color-critical)",
          border: "rgba(239, 68, 68, 0.25)",
        };
      case "neutral":
        return {
          bg: "rgba(100, 116, 139, 0.1)",
          text: "var(--text-secondary)",
          border: "rgba(100, 116, 139, 0.2)",
        };
      case "primary":
      default:
        return {
          bg: "var(--accent-subtle)",
          text: "var(--accent-primary)",
          border: "rgba(2, 132, 199, 0.25)",
        };
    }
  };

  const style = getStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: style.text }}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
}

export default StatusPill;
