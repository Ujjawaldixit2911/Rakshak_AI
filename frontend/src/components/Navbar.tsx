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
      <nav className="nav-bar">
        <div style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 1.5rem",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Brand */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #4f7cff, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 900,
              color: "#fff",
              boxShadow: "0 0 18px rgba(79,124,255,0.4)",
            }}>
              R
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#f0f4ff", letterSpacing: "-0.01em" }}>
                Rakshak <span style={{ color: "#4f7cff" }}>AI</span>
              </span>
              <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: -2 }}>
                Safety Intelligence
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NavLink href="/" active={pathname === "/"}>
              Route Navigator
            </NavLink>
            <NavLink href="/crime-search" active={pathname === "/crime-search"}>
              Crime Search
            </NavLink>
            <NavLink href="/police/login" active={pathname.startsWith("/police")}>
              Police Command
            </NavLink>

            {/* Auth status & User profile */}
            {isAuthenticated && user ? (
              <div style={{ position: "relative", marginLeft: 8 }} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 10px 4px 6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 30,
                    cursor: "pointer",
                    color: "#fff",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(79, 124, 255, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
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
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                  <div style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>
                      {user.name}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: currentFieldInfo.color, fontWeight: 700 }}>
                      {currentFieldInfo.badge}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: 2 }}>▼</span>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: 280,
                    background: "#0d1829",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 14,
                    padding: "1rem",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
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
        </div>
      </nav>

      {/* Global Field Switcher Modal */}
      <FieldSelectorModal />
    </>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link href={href} style={{
      padding: "6px 14px",
      borderRadius: 8,
      fontSize: "0.875rem",
      fontWeight: active ? 700 : 500,
      color: active ? "#fff" : "rgba(240,244,255,0.7)",
      textDecoration: "none",
      background: active ? "rgba(79,124,255,0.2)" : "transparent",
      border: active ? "1px solid rgba(79,124,255,0.35)" : "1px solid transparent",
      transition: "all 0.2s",
    }}>
      {children}
    </Link>
  );
}
