"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Landing from "@/components/pages/Landing";
import RoleSelection from "@/components/pages/RoleSelection";
import Home from "@/components/pages/Home";
import { PageBackground } from "@/components/shared/PageBackground";

export default function App() {
  const { isAuthenticated, hasSelectedRole, user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 0. Loading State during hydration / profile verification
  if (!mounted || isLoading) {
    return (
      <PageBackground className="min-h-screen flex flex-col items-center justify-center">
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "3px solid var(--accent-subtle)",
          borderTopColor: "var(--accent-primary)",
          animation: "spin 0.8s linear infinite",
          marginBottom: 16,
        }} />
        <span style={{
          fontSize: "0.78rem",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
          fontWeight: 700,
          textTransform: "uppercase"
        }}>
          Verifying Rakshak Session...
        </span>
      </PageBackground>
    );
  }

  // 1. Page 1 — Unauthenticated Landing / Voice Intro Screen
  if (!isAuthenticated || !user) {
    return <Landing />;
  }

  // 2. Page 2 — Role Selection Screen (Authenticated but no role selected yet)
  if (!hasSelectedRole || !user.roleField) {
    return <RoleSelection />;
  }

  // 3. Page 3 — Role-Based Home (Authenticated with persisted role)
  return <Home />;
}
