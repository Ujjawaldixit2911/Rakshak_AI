"use client";

import React from "react";

export type BadgeSeverity = "low" | "medium" | "high" | "critical" | "neutral" | "brand";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  severity?: BadgeSeverity;
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  severity = "neutral",
  size = "md",
  dot = false,
  className = "",
  ...props
}) => {
  // Apple-inspired restrained severity colors with clear contrast in both light and dark modes
  const severityStyles: Record<BadgeSeverity, { bg: string; text: string; dotColor: string }> = {
    low: {
      bg: "bg-[rgba(5,150,105,0.12)] border-[rgba(5,150,105,0.25)]",
      text: "text-[#059669]",
      dotColor: "bg-[#059669]",
    },
    medium: {
      bg: "bg-[rgba(217,119,6,0.12)] border-[rgba(217,119,6,0.25)]",
      text: "text-[#d97706]",
      dotColor: "bg-[#d97706]",
    },
    high: {
      bg: "bg-[rgba(234,88,12,0.12)] border-[rgba(234,88,12,0.25)]",
      text: "text-[#ea580c]",
      dotColor: "bg-[#ea580c]",
    },
    critical: {
      bg: "bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.25)]",
      text: "text-[#dc2626]",
      dotColor: "bg-[#dc2626]",
    },
    brand: {
      bg: "bg-[var(--accent-subtle)] border-[rgba(5,150,105,0.25)]",
      text: "text-[var(--accent-primary)]",
      dotColor: "bg-[var(--accent-primary)]",
    },
    neutral: {
      bg: "bg-[var(--bg-card)] border-[var(--border-subtle)]",
      text: "text-[var(--text-secondary)]",
      dotColor: "bg-[var(--text-muted)]",
    },
  };

  const current = severityStyles[severity] || severityStyles.neutral;

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 rounded-full gap-1.5",
    md: "text-[12px] px-2.5 py-1 rounded-full gap-1.5",
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center font-bold tracking-tight
        border select-none shadow-sm
        ${current.bg}
        ${current.text}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotColor} animate-pulse`}
        />
      )}
      {children}
    </span>
  );
};

Badge.displayName = "Badge";
export default Badge;
