"use client";

import React, { forwardRef } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
  padded?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hoverLift = false, padded = true, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          relative rounded-3xl bg-white/[0.04] border border-white/[0.08]
          backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]
          transition-all duration-200 ease-out overflow-hidden
          ${hoverLift ? "@media(hover:hover):hover:-translate-y-0.5 @media(hover:hover):hover:border-white/[0.14] @media(hover:hover):hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]" : ""}
          ${padded ? "p-6 sm:p-7 md:p-8" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
