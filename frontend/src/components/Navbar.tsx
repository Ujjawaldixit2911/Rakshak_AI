"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import FieldSelectorModal from "./auth/FieldSelectorModal";
import TripHistoryModal from "./TripHistoryModal";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, openFieldModal, openHistoryModal, currentFieldInfo } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !isAuthenticated || !user) {
    return null;
  }

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
          background: "var(--bg-surface)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "9999px",
          padding: "0.5rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "var(--shadow-card)",
          gap: 12,
        }}>
          {/* Brand */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0284c7, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              fontWeight: 900,
              color: "#fff",
              boxShadow: "0 2px 10px rgba(2, 132, 199, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}>
              🛡️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Rakshak<span style={{ color: "var(--accent-primary)" }}>AI</span>
                </span>
              </div>
              <span style={{ display: "block", fontSize: "0.64rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.02em", marginTop: -2 }}>
                Safety & Smart Navigation
              </span>
            </div>
          </Link>

          {/* Central Nav links */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
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
                padding: "6px 13px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "transparent",
                border: "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              ⚡ 4 Pillars
            </button>
            <NavLink href="/police/login" active={pathname.startsWith("/police")}>
              👮 Police Command
            </NavLink>
          </div>

          {/* Right Status, Theme Toggle & Profile Area */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              color: "#059669",
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 6px #10b981",
              }} />
              <span>99.9% Operational</span>
            </div>

            {/* Dark / Light Mode Manual Toggle */}
            <ThemeToggle />

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
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    transition: "all 0.2s",
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
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                  <div style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                      {user.name}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: currentFieldInfo.color, fontWeight: 700 }}>
                      {currentFieldInfo.badge}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: 2 }}>▼</span>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 10px)",
                    width: 280,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 18,
                    padding: "1rem",
                    boxShadow: "var(--shadow-elevation)",
                    zIndex: 1000,
                  }}>
                    {/* Header profile info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)" }}>
                      <img
                        src={user.avatar}
                        alt={user.name}
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.name}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.email}
                        </div>
                      </div>
                    </div>

                    {/* Active field banner */}
                    <div style={{
                      margin: "10px 0",
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "var(--accent-dim)",
                      border: `1px solid ${currentFieldInfo.color}33`,
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Active Field Mode:
                      </div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>
                        {currentFieldInfo.icon} {currentFieldInfo.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        {currentFieldInfo.tagline}
                      </div>
                    </div>

                    {/* Trip History action */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        openHistoryModal();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        marginBottom: 6,
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ fontSize: "0.95rem" }}>🕒</span>
                      <span>Recent Trip History</span>
                    </button>

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
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--accent-primary)",
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
                        color: "#ef4444",
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

      {/* Global Trip History Modal */}
      <TripHistoryModal />
    </>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link href={href} style={{
      padding: "6px 13px",
      borderRadius: "9999px",
      fontSize: "0.82rem",
      fontWeight: active ? 700 : 500,
      color: active ? "var(--accent-primary)" : "var(--text-secondary)",
      textDecoration: "none",
      background: active ? "var(--accent-dim)" : "transparent",
      border: active ? "1px solid var(--border-focus)" : "1px solid transparent",
      transition: "all 0.15s ease",
    }}>
      {children}
    </Link>
  );
}

