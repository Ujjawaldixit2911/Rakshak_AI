"use client";

import React, { useState } from "react";
import { COLOR_LEGEND_ITEMS, getRiskConfig } from "./riskColors";
import { ShieldCheck, Info, ChevronDown, ChevronUp } from "lucide-react";

interface ColorLegendProps {
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({
  className = "",
  collapsible = true,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl text-white transition-all duration-200 overflow-hidden ${className}`}
      style={{ minWidth: "220px", maxWidth: "300px" }}
    >
      {/* Header */}
      <div
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/50 ${
          collapsible ? "cursor-pointer hover:bg-slate-800 transition-colors" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Safety Risk Legend
          </span>
        </div>
        {collapsible && (
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 p-0.5"
            aria-label={isExpanded ? "Collapse legend" : "Expand legend"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Legend Items */}
      {isExpanded && (
        <div className="p-3 space-y-2 text-xs">
          {COLOR_LEGEND_ITEMS.map((item) => (
            <div
              key={item.level}
              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: item.hex }}
                />
                <span className="font-semibold text-slate-200">
                  {item.emoji} {item.label}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${item.bgClass} ${item.textClass} ${item.borderClass}`}
              >
                {item.scoreRange}
              </span>
            </div>
          ))}

          <div className="pt-2 border-t border-slate-800 flex items-start gap-1.5 text-[10px] text-slate-400 leading-tight">
            <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
            <span>
              Route segments &amp; hotspots adapt dynamically to live safety scores.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorLegend;
