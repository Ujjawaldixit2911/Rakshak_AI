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
  // Apple-inspired restrained severity colors (used ONLY for data severity)
  const severityStyles: Record<BadgeSeverity, { bg: string; text: string; dotColor: string }> = {
    low: {
      bg: "bg-[#34c759]/15 border-[#34c759]/30",
      text: "text-[#34c759]",
      dotColor: "bg-[#34c759]",
    },
    medium: {
      bg: "bg-[#ffcc00]/15 border-[#ffcc00]/30",
      text: "text-[#ffcc00]",
      dotColor: "bg-[#ffcc00]",
    },
    high: {
      bg: "bg-[#ff9500]/15 border-[#ff9500]/30",
      text: "text-[#ff9500]",
      dotColor: "bg-[#ff9500]",
    },
    critical: {
      bg: "bg-[#ff3b30]/15 border-[#ff3b30]/30",
      text: "text-[#ff3b30]",
      dotColor: "bg-[#ff3b30]",
    },
    brand: {
      bg: "bg-[#0071e3]/15 border-[#0071e3]/30",
      text: "text-[#0071e3]",
      dotColor: "bg-[#0071e3]",
    },
    neutral: {
      bg: "bg-white/[0.06] border-white/[0.12]",
      text: "text-white/80",
      dotColor: "bg-white/60",
    },
  };

  const current = severityStyles[severity] || severityStyles.neutral;

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 rounded-full gap-1.5",
    md: "text-[13px] px-2.5 py-1 rounded-full gap-2",
  };

  return (
    <span
      className={`
        inline-flex items-center font-semibold tracking-tight border
        ${current.bg} ${current.text} ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${current.dotColor} shrink-0 animate-pulse`}
        />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
