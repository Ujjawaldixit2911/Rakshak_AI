"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
      style,
      ...props
    },
    ref
  ) => {
    // SaaS variant styling with CSS variables
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white shadow-[0_2px_10px_rgba(2,132,199,0.3)] hover:shadow-[0_4px_16px_rgba(2,132,199,0.4)] border border-transparent",
      secondary:
        "bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-[var(--shadow-sm)]",
      ghost:
        "bg-transparent hover:bg-[var(--accent-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent",
      destructive:
        "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-xl gap-1.5",
      md: "min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-xl gap-2",
      lg: "min-h-[50px] px-6 py-3 text-base font-semibold rounded-2xl gap-2.5",
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center select-none font-['Inter',-apple-system,sans-serif]
          transition-all duration-200 ease-out cursor-pointer outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2
          active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        style={style}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="inline-flex shrink-0 items-center justify-center">
                {icon}
              </span>
            )}
            {children && <span className="truncate">{children}</span>}
            {icon && iconPosition === "right" && (
              <span className="inline-flex shrink-0 items-center justify-center">
                {icon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
