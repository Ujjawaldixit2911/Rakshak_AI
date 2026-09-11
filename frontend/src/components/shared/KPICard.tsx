"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card } from "./Card";

export interface KPICardProps {
  label: string;
  value: number | string;
  numericTarget?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  icon: React.ElementType | React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  accentColor?: "blue" | "green" | "amber" | "rose" | "purple" | "cyan";
  delta?: string | number | { value: string | number; isPositive?: boolean };
  deltaType?: "increase" | "decrease" | "neutral";
  caption?: string;
  contextCaption?: string;
  severity?: "safe" | "moderate" | "high" | "critical" | null;
  className?: string;
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  numericTarget,
  suffix = "",
  prefix = "",
  decimals = 0,
  icon,
  iconColor,
  iconBg,
  accentColor = "blue",
  delta,
  deltaType = "neutral",
  caption,
  contextCaption,
  severity = null,
  className = "",
  onClick,
}: KPICardProps) {
  const finalCaption = caption || contextCaption;

  // Count-up animation on mount if numericTarget or value is numeric
  const [displayValue, setDisplayValue] = useState<number | string>(() => {
    if (typeof numericTarget === "number") return 0;
    if (typeof value === "number") return 0;
    return value;
  });

  useEffect(() => {
    const target = typeof numericTarget === "number" ? numericTarget : typeof value === "number" ? value : null;
    if (target === null || isNaN(target)) {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    const updateCount = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = start + (target - start) * eased;
      setDisplayValue(decimals > 0 ? Number(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setDisplayValue(target);
      }
    };

    requestAnimationFrame(updateCount);
  }, [value, numericTarget, decimals]);

  const renderDelta = () => {
    if (!delta) return null;

    let deltaText: string | number = "";
    let isPositive = deltaType === "increase";

    if (typeof delta === "object" && delta !== null && "value" in delta) {
      deltaText = delta.value;
      isPositive = delta.isPositive ?? true;
    } else {
      deltaText = delta;
    }

    const isGood = isPositive
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
      : "text-rose-600 dark:text-rose-400 bg-rose-500/10";

    const ArrowIcon = isPositive ? ArrowUpRight : ArrowDownRight;

    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${isGood}`}
      >
        <ArrowIcon className="w-3 h-3 stroke-[2.5]" />
        <span>{deltaText}</span>
      </span>
    );
  };

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === "function" || typeof icon === "object") {
      const IconComponent = icon as React.ElementType;
      return <IconComponent className="w-5 h-5" />;
    }
    return null;
  };

  return (
    <Card
      hoverLift={!!onClick}
      severityColor={severity}
      onClick={onClick}
      className={`p-6 md:p-7 flex flex-col justify-between ${className}`}
    >
      {/* Top Row: Icon Chip + Label */}
      <div className="flex items-center gap-3.5 mb-4">
        {/* 40x40px Icon Chip */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200"
          style={{
            backgroundColor: iconBg || "var(--accent-dim)",
            color: iconColor || "var(--accent-primary)",
          }}
        >
          {renderIcon()}
        </div>

        <span
          className="text-xs md:text-sm font-bold tracking-tight uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </span>
      </div>

      {/* Center: Big Number (Tabular nums) */}
      <div className="mb-2">
        <div
          className="text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {prefix}
          {typeof displayValue === "number" ? displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : displayValue}
          {suffix}
        </div>
      </div>

      {/* Bottom Row: Context Caption + Delta Pill */}
      {(finalCaption || delta) && (
        <div className="flex items-center flex-wrap gap-2 text-xs pt-1" style={{ color: "var(--text-muted)" }}>
          {renderDelta()}
          {finalCaption && <span className="truncate">{finalCaption}</span>}
        </div>
      )}
    </Card>
  );
}

export default KPICard;
