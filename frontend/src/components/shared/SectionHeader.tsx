"use client";

import React from "react";

interface SectionHeaderProps {
  title: string;
  subtext?: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ElementType;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SectionHeader({
  title,
  subtext,
  description,
  badge,
  action,
  icon: Icon,
  align = "left",
  className = "",
}: SectionHeaderProps) {
  const finalSubtext = subtext || description;
  const isCentered = align === "center";

  return (
    <div className={`flex flex-col ${isCentered ? "items-center text-center" : "sm:flex-row sm:items-center justify-between"} gap-3 mb-6 ${className}`}>
      <div className={isCentered ? "flex flex-col items-center text-center" : ""}>
        {badge && (
          <div className="mb-2">
            {typeof badge === "string" ? (
              <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--border-subtle)]">
                {badge}
              </span>
            ) : (
              badge
            )}
          </div>
        )}
        <div className={`flex items-center gap-2 mb-1.5 ${isCentered ? "justify-center" : ""}`}>
          {Icon && <Icon className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />}
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {title}
          </h2>
        </div>
        {finalSubtext && (
          <p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            {finalSubtext}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

export default SectionHeader;
