"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  const sizeClasses = size === "sm" ? "w-8 h-8 p-1.5" : "w-9 h-9 p-2";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-4.5 h-4.5";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`
        relative rounded-xl flex items-center justify-center
        transition-all duration-200 cursor-pointer outline-none
        border border-[var(--border-subtle)]
        bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]
        text-[var(--text-secondary)] hover:text-[var(--text-primary)]
        shadow-[var(--shadow-sm)] active:scale-95
        ${sizeClasses} ${className}
      `}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {isDark ? (
          <Sun className={`${iconSize} text-amber-400 rotate-0 transition-transform duration-300`} />
        ) : (
          <Moon className={`${iconSize} text-slate-700 dark:text-slate-200 rotate-0 transition-transform duration-300`} />
        )}
      </div>
    </button>
  );
}

export default ThemeToggle;
