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
    // Apple-inspired variant styles
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-[0_4px_14px_rgba(0,113,227,0.3)] hover:shadow-[0_6px_20px_rgba(0,113,227,0.4)] border border-[#0071e3]/40",
      secondary:
        "bg-white/[0.06] hover:bg-white/[0.12] text-white/90 hover:text-white border border-white/[0.12] backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
      ghost:
        "bg-transparent hover:bg-white/[0.06] text-white/75 hover:text-white border border-transparent",
      destructive:
        "bg-[#ff3b30]/15 hover:bg-[#ff3b30]/25 text-[#ff3b30] border border-[#ff3b30]/30 shadow-[0_2px_10px_rgba(255,59,48,0.15)]",
    };

    // Minimum 44x44px touch targets on all breakpoints
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "min-h-[44px] min-w-[44px] px-3.5 py-2 text-[13px] font-medium tracking-tight rounded-xl gap-2",
      md: "min-h-[44px] min-w-[44px] px-5 py-2.5 text-[15px] font-medium tracking-tight rounded-2xl gap-2.5",
      lg: "min-h-[50px] min-w-[50px] px-6 py-3 text-[16px] font-semibold tracking-tight rounded-2xl gap-3",
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center select-none font-['Inter',-apple-system,'SF_Pro_Display',system-ui,sans-serif]
          transition-all duration-200 ease-out cursor-pointer outline-none
          focus-visible:ring-2 focus-visible:ring-[#0071e3]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
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
