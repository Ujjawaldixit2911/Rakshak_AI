"use client";

import React from "react";

interface PageBackgroundProps {
  children: React.ReactNode;
  className?: string;
  showBlobs?: boolean;
}

export function PageBackground({
  children,
  className = "",
  showBlobs = true,
}: PageBackgroundProps) {
  return (
    <div
      className={`relative min-h-screen w-full transition-colors duration-250 ${className}`}
      style={{
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      {/* Subtle Layered Radial Gradient Blobs (4-8% opacity in light, low opacity in dark) */}
      {showBlobs && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          {/* Top Hero Ambient Blob */}
          <div
            className="absolute -top-32 -left-32 w-[580px] h-[580px] rounded-full blur-3xl opacity-70 transition-all duration-300"
            style={{
              background: "radial-gradient(circle, var(--mesh-blob-1) 0%, transparent 70%)",
            }}
          />

          {/* Top Right Ambient Blob */}
          <div
            className="absolute top-1/4 -right-32 w-[520px] h-[520px] rounded-full blur-3xl opacity-60 transition-all duration-300"
            style={{
              background: "radial-gradient(circle, var(--mesh-blob-2) 0%, transparent 70%)",
            }}
          />

          {/* Lower Page Ambient Blob */}
          <div
            className="absolute bottom-12 left-1/3 w-[620px] h-[620px] rounded-full blur-3xl opacity-50 transition-all duration-300"
            style={{
              background: "radial-gradient(circle, var(--mesh-blob-3) 0%, transparent 75%)",
            }}
          />
        </div>
      )}

      {/* Page Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export default PageBackground;
