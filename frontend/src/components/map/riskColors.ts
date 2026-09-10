/**
 * riskColors.ts / riskColors.js
 * Shared risk level color definitions, thresholds, and helpers for Rakshak AI Map Intelligence.
 * Used consistently across all map layers, legends, and UI components.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "SAFE" | "MODERATE";

export interface RiskColorConfig {
  hex: string;
  fillHex: string;
  borderHex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
  emoji: string;
  scoreRange: string;
  description: string;
}

export const RISK_COLORS: Record<string, string> = {
  LOW: "#10B981",       // Emerald / Green (🟢 Safe)
  SAFE: "#10B981",      // Baseline Safe
  MEDIUM: "#EAB308",    // Amber / Yellow (🟡 Medium)
  MODERATE: "#EAB308",  // Moderate
  HIGH: "#F97316",      // Orange (🟠 High)
  CRITICAL: "#EF4444",  // Red / Crimson (🔴 Critical)
};

export const RISK_LEVEL_CONFIG: Record<string, RiskColorConfig> = {
  LOW: {
    hex: "#10B981",
    fillHex: "rgba(16, 185, 129, 0.25)",
    borderHex: "#059669",
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-500/15",
    borderClass: "border-emerald-500/30",
    label: "Safe",
    emoji: "🟢",
    scoreRange: "80 – 100",
    description: "Low crime density, well-monitored corridor, safe travel zone.",
  },
  MEDIUM: {
    hex: "#EAB308",
    fillHex: "rgba(234, 179, 8, 0.25)",
    borderHex: "#D97706",
    textClass: "text-amber-400",
    bgClass: "bg-amber-500/15",
    borderClass: "border-amber-500/30",
    label: "Medium",
    emoji: "🟡",
    scoreRange: "60 – 79",
    description: "Moderate activity, stay vigilant during late-night hours.",
  },
  HIGH: {
    hex: "#F97316",
    fillHex: "rgba(249, 115, 22, 0.30)",
    borderHex: "#EA580C",
    textClass: "text-orange-400",
    bgClass: "bg-orange-500/15",
    borderClass: "border-orange-500/30",
    label: "High",
    emoji: "🟠",
    scoreRange: "40 – 59",
    description: "Elevated incident frequency, avoid unlit side alleys.",
  },
  CRITICAL: {
    hex: "#EF4444",
    fillHex: "rgba(239, 68, 68, 0.35)",
    borderHex: "#DC2626",
    textClass: "text-rose-400",
    bgClass: "bg-rose-500/15",
    borderClass: "border-rose-500/30",
    label: "Critical",
    emoji: "🔴",
    scoreRange: "0 – 39",
    description: "High crime hotspot cluster, active police surveillance advised.",
  },
};

export const COLOR_LEGEND_ITEMS = [
  { level: "LOW", ...RISK_LEVEL_CONFIG.LOW },
  { level: "MEDIUM", ...RISK_LEVEL_CONFIG.MEDIUM },
  { level: "HIGH", ...RISK_LEVEL_CONFIG.HIGH },
  { level: "CRITICAL", ...RISK_LEVEL_CONFIG.CRITICAL },
];

/**
 * Returns the hex color string corresponding to a riskLevel.
 * Defaults to Emerald (#10B981) if unspecified or unrecognized.
 */
export function getRiskColor(riskLevel?: string | null, fallback = "#10B981"): string {
  if (!riskLevel) return fallback;
  const normalized = riskLevel.toUpperCase().trim();
  return RISK_COLORS[normalized] || fallback;
}

/**
 * Maps a numerical 0-100 safety score to a standardized RiskLevel string.
 */
export function getRiskLevelFromScore(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

/**
 * Returns complete UI styling metadata for a given risk level string.
 */
export function getRiskConfig(riskLevel?: string | null): RiskColorConfig {
  if (!riskLevel) return RISK_LEVEL_CONFIG.LOW;
  const normalized = riskLevel.toUpperCase().trim();
  if (normalized === "SAFE") return RISK_LEVEL_CONFIG.LOW;
  if (normalized === "MODERATE") return RISK_LEVEL_CONFIG.MEDIUM;
  return RISK_LEVEL_CONFIG[normalized] || RISK_LEVEL_CONFIG.LOW;
}

export default {
  RISK_COLORS,
  RISK_LEVEL_CONFIG,
  COLOR_LEGEND_ITEMS,
  getRiskColor,
  getRiskLevelFromScore,
  getRiskConfig,
};
