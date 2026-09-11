"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import FieldSelectorModal from "./auth/FieldSelectorModal";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, openFieldModal, currentFieldInfo } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header style={{
        position: "sticky",
        top: "12px",
        zIndex: 1000,
        padding: "0 1rem",
        width: "100%",
        maxWidth: 1240,
        margin: "0 auto",
      }}>
        <nav style={{
          background: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "9999px",
          padding: "0.5rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(79, 124, 255, 0.15)",
          gap: 12,
        }}>
          {/* Brand */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 900,
              color: "#fff",
              boxShadow: "0 0 16px rgba(59, 130, 246, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}>
              🛡️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 900, fontSize: "1.1rem", color: "#f8fafc", letterSpacing: "-0.02em" }}>
                  Rakshak<span style={{ color: "#38bdf8" }}>AI</span>
                </span>
                <span style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}>
                  2.0
                </span>
              </div>
              <span style={{ display: "block", fontSize: "0.64rem", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.04em", marginTop: -2 }}>
                Safety & Smart Navigation
              </span>
            </div>
          </Link>

          {/* Central Nav links */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <NavLink href="/" active={pathname === "/"}>
              🗺️ Route Navigator
            </NavLink>
            <NavLink href="/crime-search" active={pathname === "/crime-search"}>
              🔍 Crime Heatmap
            </NavLink>
            <button
              onClick={() => {
                const el = document.getElementById("four-pillars-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: "0.84rem",
                fontWeight: 600,
                color: "rgba(240,244,255,0.75)",
                background: "transparent",
                border: "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(240,244,255,0.75)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              ⚡ 4 Pillars
            </button>
            <NavLink href="/police/login" active={pathname.startsWith("/police")}>
              👮 Police Command
            </NavLink>
          </div>

          {/* Right Status & Profile Area */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Live Telemetry Status Pill */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: "9999px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#34d399",
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
                animation: "pulse 1.5s infinite",
              }} />
              <span>99.9% Operational</span>
            </div>

            {/* Auth status & User profile */}
            {isAuthenticated && user ? (
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 10px 4px 6px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    color: "#fff",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                  }}
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1px solid rgba(255,255,255,0.25)",
                    }}
                  />
                  <div style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>
                      {user.name}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: currentFieldInfo.color, fontWeight: 700 }}>
                      {currentFieldInfo.badge}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#94a3b8", marginLeft: 2 }}>▼</span>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 10px)",
                    width: 280,
                    background: "#0d1829",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 18,
                    padding: "1rem",
                    boxShadow: "0 20px 45px rgba(0,0,0,0.7), 0 0 20px rgba(59, 130, 246, 0.15)",
                    zIndex: 1000,
                  }}>
                    {/* Header profile info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <img
                        src={user.avatar}
                        alt={user.name}
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.name}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.email}
                        </div>
                      </div>
                    </div>

                    {/* Active field banner */}
                    <div style={{
                      margin: "10px 0",
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: currentFieldInfo.bgGlow,
                      border: `1px solid ${currentFieldInfo.color}33`,
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                        Active Field Mode:
                      </div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff", marginTop: 2 }}>
                        {currentFieldInfo.icon} {currentFieldInfo.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#cbd5e1", marginTop: 2 }}>
                        {currentFieldInfo.tagline}
                      </div>
                    </div>

                    {/* Switch Field action */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        openFieldModal();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#93c5fd",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        marginBottom: 6,
                        textAlign: "left",
                      }}
                    >
                      <span>🔄</span>
                      <span>Switch Field / Purpose</span>
                    </button>

                    {/* Sign out */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "#fca5a5",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span>🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </nav>
      </header>

      {/* Global Field Switcher Modal */}
      <FieldSelectorModal />
    </>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link href={href} style={{
      padding: "6px 14px",
      borderRadius: "9999px",
      fontSize: "0.84rem",
      fontWeight: active ? 700 : 500,
      color: active ? "#fff" : "rgba(240,244,255,0.75)",
      textDecoration: "none",
      background: active ? "rgba(59, 130, 246, 0.25)" : "transparent",
      border: active ? "1px solid rgba(59, 130, 246, 0.45)" : "1px solid transparent",
      boxShadow: active ? "0 0 12px rgba(59, 130, 246, 0.25)" : "none",
      transition: "all 0.2s",
    }}>
      {children}
    </Link>
  );
}

