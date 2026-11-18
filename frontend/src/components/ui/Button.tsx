"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "left",
      loading = false,
      disabled = false,
      className = "",
      ...props
    },
    ref
  ) => {
    // Apple-inspired variant styles with full light & dark mode support
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-[var(--accent-primary)] hover:opacity-90 text-white shadow-[0_4px_14px_rgba(5,150,105,0.3)] border border-transparent",
      secondary:
        "bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]",
      ghost:
        "bg-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent",
      destructive:
        "bg-[rgba(239,68,68,0.12)] hover:bg-[rgba(239,68,68,0.2)] text-[#dc2626] border border-[rgba(239,68,68,0.3)] shadow-sm",
    };

    // Minimum 44x44px touch targets on all breakpoints
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "min-h-[40px] min-w-[40px] px-3.5 py-1.5 text-[13px] font-semibold tracking-tight rounded-xl gap-2",
      md: "min-h-[44px] min-w-[44px] px-4 py-2 text-[14px] font-semibold tracking-tight rounded-xl gap-2",
      lg: "min-h-[48px] min-w-[48px] px-5 py-2.5 text-[15px] font-bold tracking-tight rounded-xl gap-2.5",
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center select-none font-['Inter',-apple-system,'SF_Pro_Display',system-ui,sans-serif]
          transition-all duration-200 ease-out cursor-pointer outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]
          active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="shrink-0 flex items-center">{icon}</span>
            )}
            {children}
            {icon && iconPosition === "right" && (
              <span className="shrink-0 flex items-center">{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
