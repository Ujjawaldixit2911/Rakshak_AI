"use client";

import React, { useState } from "react";
import { Copy, Check, MapPin } from "lucide-react";

export interface LocationCoordinatesBadgeProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  label?: string;
  className?: string;
}

export const LocationCoordinatesBadge: React.FC<LocationCoordinatesBadgeProps> = ({
  latitude,
  longitude,
  accuracy,
  label,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const formatted = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs font-mono text-slate-300 shadow-sm backdrop-blur-md ${className}`}
    >
      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
      {label && <span className="font-sans font-semibold text-slate-400">{label}:</span>}
      <span className="text-cyan-300">{formatted}</span>
      {accuracy !== undefined && (
        <span className="text-[10px] text-slate-500">±{Math.round(accuracy)}m</span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors ml-1"
        title="Copy Coordinates"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
};
