"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverLift?: boolean;
  severityColor?: "safe" | "moderate" | "high" | "critical" | null;
  className?: string;
}

export function Card({
  children,
  hoverLift = false,
  severityColor = null,
  className = "",
  style,
  ...props
}: CardProps) {
  const getSeverityBar = () => {
    switch (severityColor) {
      case "safe":
        return "var(--color-safe)";
      case "moderate":
        return "var(--color-moderate)";
      case "high":
        return "var(--color-high)";
      case "critical":
        return "var(--color-critical)";
      default:
        return null;
    }
  };

  const topBarColor = getSeverityBar();

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        transition-all duration-200 ease-out
        ${hoverLift ? "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer" : ""}
        ${className}
      `}
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-card)",
        color: "var(--text-primary)",
        ...style,
      }}
      {...props}
    >
      {/* Optional Top Severity Accent Bar */}
      {topBarColor && (
        <div
          className="absolute top-0 left-0 right-0 h-[3.5px] z-10"
          style={{ backgroundColor: topBarColor }}
        />
      )}
      {children}
    </div>
  );
}

export default Card;
