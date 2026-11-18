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
          relative rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]
          shadow-[var(--shadow-card)] text-[var(--text-primary)]
          transition-all duration-200 ease-out overflow-hidden
          ${hoverLift ? "@media(hover:hover):hover:-translate-y-0.5 @media(hover:hover):hover:border-[var(--accent-primary)] @media(hover:hover):hover:shadow-lg" : ""}
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
