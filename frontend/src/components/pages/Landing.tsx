"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth, USER_FIELDS, UserFieldKey } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export const DEMO_CREDENTIALS = {
  email: "demo@rakshak.ai",
  password: "Rakshak@2026",
  name: "Ujjawal Dixit",
};

interface LandingProps {
  onSignInSuccess?: () => void;
}

export function Landing({ onSignInSuccess }: LandingProps) {
  const { loginWithGoogle } = useAuth();

  const [step, setStep] = useState<1 | 2>(1); // Step 1: Auth, Step 2: Select Field/Role
  const [selectedAccount, setSelectedAccount] = useState<{
    name: string;
    email: string;
    avatar: string;
  } | null>(null);

  // Email & Password login state
  const [emailInput, setEmailInput] = useState("demo@rakshak.ai");
  const [passwordInput, setPasswordInput] = useState("Rakshak@2026");
  const [nameInput, setNameInput] = useState("Ujjawal Dixit");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Field/Role selection
  const [selectedField, setSelectedField] = useState<UserFieldKey>("citizen");

  // Avatar Speech State
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [captionIdx, setCaptionIdx] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const englishDialogue = [
    "Hello! I am your Rakshak Safety Guide.",
    "Standard navigation apps only focus on the shortest or fastest path, even if it takes you through dark and risky alleys.",
    "Rakshak analyzes real crime hotspots, street lighting, and police patrolling to compute the safest possible route.",
    "Even if it takes 2 minutes more, we ensure you always reach your destination safely and securely.",
    "Now you can log in to explore the live safety platform. Let's get started!"
  ];

  const activeDialogue = englishDialogue;

  // Natural Human Speech Engine
  const handleStartSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    setCaptionIdx(0);

    const fullSpeechText = activeDialogue.join(" ");
    const utterance = new SpeechSynthesisUtterance(fullSpeechText);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => (v.lang === "en-IN" || v.lang.includes("India")) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Rishi") || v.name.includes("Prabhat"))) ||
      voices.find((v) => v.lang.startsWith("en-IN")) ||
      voices.find((v) => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB") || v.lang.startsWith("en"));

    if (naturalVoice) utterance.voice = naturalVoice;
    utterance.lang = "en-IN";
    utterance.rate = 0.92;
    utterance.pitch = 1.02;

    const intervalTime = (fullSpeechText.length * 52) / activeDialogue.length;
    let stepCount = 0;
    const interval = setInterval(() => {
      stepCount++;
      if (stepCount < activeDialogue.length) {
        setCaptionIdx(stepCount);
      } else {
        clearInterval(interval);
      }
    }, intervalTime);

    utterance.onend = () => {
      setIsPlayingVoice(false);
      clearInterval(interval);
      setCaptionIdx(activeDialogue.length - 1);
    };
    utterance.onerror = () => {
      setIsPlayingVoice(false);
      clearInterval(interval);
    };

    setIsPlayingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingVoice(false);
  };

  // Attempt auto-speech on first page load
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    
    const timer = setTimeout(() => {
      try {
        handleStartSpeech();
      } catch (e) {
        console.warn("Autoplay notice:", e);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Direct Google Sign-In Trigger
  const triggerGooglePrompt = () => {
    handleStopSpeech();
    setSelectedAccount({
      name: "Ujjawal Dixit",
      email: "ujjawal.rakshak@gmail.com",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=ujjawal&backgroundColor=059669,047857",
    });
    setStep(2);
  };

  // Email/Password Sign-in
  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!emailInput || !passwordInput) {
      setLoginError("Kripya email aur password dono enter karein.");
      return;
    }

    handleStopSpeech();
    if (emailInput.trim() === DEMO_CREDENTIALS.email && passwordInput === DEMO_CREDENTIALS.password) {
      setSelectedAccount({
        name: nameInput || DEMO_CREDENTIALS.name,
        email: emailInput,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emailInput)}&backgroundColor=059669,047857`,
      });
      setStep(2);
    } else if (emailInput.includes("@")) {
      setSelectedAccount({
        name: nameInput || emailInput.split("@")[0],
        email: emailInput,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emailInput)}&backgroundColor=059669,047857`,
      });
      setStep(2);
    } else {
      setLoginError("Invalid credentials. Use 'demo@rakshak.ai' / 'Rakshak@2026'");
    }
  };

  // Final Step: Confirm Field and Enter Platform
  const handleFinalConfirm = () => {
    if (!selectedAccount) return;
    setIsLoggingIn(true);
    handleStopSpeech();
    setTimeout(() => {
      loginWithGoogle(
        {
          name: selectedAccount.name,
          email: selectedAccount.email,
          avatar: selectedAccount.avatar,
        },
        selectedField
      );
      setIsLoggingIn(false);
      if (onSignInSuccess) onSignInSuccess();
    }, 300);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Background Ambient Tonal Blobs */}
      <div
        style={{
          position: "absolute",
          top: "-150px",
          left: "-100px",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, var(--mesh-blob-1) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-150px",
          right: "-100px",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, var(--mesh-blob-2) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Main Large Dual Stage Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "28px",
          boxShadow: "var(--shadow-modal)",
          overflow: "hidden",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            minHeight: "680px",
          }}
        >
          {/* ── LEFT PANE: AVATAR PRESENTER STAGE ───────────────────────────── */}
          <div
            style={{
              padding: "2.5rem 2rem",
              background: "var(--bg-card)",
              borderRight: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
            }}
          >
            <div>
              {/* Top Mission Pill & Language Switcher & Theme Toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: "var(--accent-subtle)",
                      color: "var(--accent-primary)",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      border: "1px solid rgba(5, 150, 105, 0.25)",
                    }}
                  >
                    🛡️ RAKSHAK SAFETY PLATFORM
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: "var(--bg-card-hover)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    🔊 English Audio
                  </span>
                  <ThemeToggle size="sm" />
                </div>
              </div>

              {/* Character Illustration Stage */}
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    width: "130px",
                    height: "190px",
                    flexShrink: 0,
                    borderRadius: "18px",
                    overflow: "hidden",
                    border: isPlayingVoice ? "2.5px solid var(--accent-primary)" : "2px solid var(--border-subtle)",
                    boxShadow: isPlayingVoice
                      ? "0 0 25px var(--accent-glow), var(--shadow-card-hover)"
                      : "var(--shadow-card)",
                    background: "var(--bg-card-hover)",
                    position: "relative",
                  }}
                >
                  <img
                    src="/assets/presenter_character.jpg"
                    alt="Rakshak Safety Guide"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top center",
                      transform: isPlayingVoice ? "scale(1.03)" : "scale(1)",
                      transition: "transform 0.4s ease",
                    }}
                  />
                  {isPlayingVoice && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 6,
                        left: "50%",
                        transform: "translateX(-50%)",
                        padding: "2px 8px",
                        background: "var(--accent-primary)",
                        borderRadius: 10,
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      SPEAKING
                    </div>
                  )}
                </div>

                <div>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                    "Navigate Smart. Stay Safe."
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                    Meet your personal Safety Guide. We replace risky shortcuts with verified, well-lit, police-patrolled safe corridors.
                  </p>
                </div>
              </div>

              {/* Speech Teleprompter Bubble */}
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "16px",
                  background: "var(--bg-card-hover)",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.1rem" }}>🎙️</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--accent-primary)", textTransform: "uppercase" }}>
                    Safety Briefing
                  </span>
                </div>
                <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.55, fontWeight: 500, minHeight: "75px" }}>
                  <span style={{ color: "var(--accent-primary)", fontWeight: 800 }}>"</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {activeDialogue[captionIdx] || activeDialogue[0]}
                  </span>
                  <span style={{ color: "var(--accent-primary)", fontWeight: 800 }}>"</span>
                </div>
              </div>
            </div>

            {/* Voice Control Button */}
            <div>
              <button
                onClick={isPlayingVoice ? handleStopSpeech : handleStartSpeech}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "12px",
                  background: isPlayingVoice
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #059669, #047857)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(5, 150, 105, 0.35)",
                }}
              >
                <span>{isPlayingVoice ? "⏹️ Stop Audio" : "🔊 Listen to Voice Message"}</span>
              </button>
            </div>
          </div>

          {/* ── RIGHT PANE: GOOGLE OAUTH & EMAIL SIGN-IN PORTAL ─────────────── */}
          <div
            style={{
              padding: "2.5rem 2.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: "var(--bg-surface)",
            }}
          >
            {step === 1 ? (
              <div>
                {/* Header */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 6, background: "var(--accent-subtle)", color: "var(--accent-primary)", fontSize: "0.72rem", fontWeight: 800 }}>
                      CITIZEN & RESPONDER ACCESS
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", margin: "4px 0" }}>
                    Sign in to Rakshak
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                    Enter credentials or use 1-click demo autofill, then continue.
                  </p>
                </div>

                {/* 1. 1-Click Auto-Fill Demo Credentials (TOP) */}
                <button
                  type="button"
                  onClick={() => {
                    setEmailInput(DEMO_CREDENTIALS.email);
                    setPasswordInput(DEMO_CREDENTIALS.password);
                    setNameInput(DEMO_CREDENTIALS.name);
                    setIsRegisterMode(false);
                    setLoginError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    background: "var(--accent-subtle)",
                    border: "1px solid rgba(5, 150, 105, 0.3)",
                    color: "var(--accent-primary)",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: "1rem",
                  }}
                >
                  <span>⚡ 1-Click Autofill: demo@rakshak.ai / Rakshak@2026</span>
                </button>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth}>
                  {isRegisterMode && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Ujjawal Dixit"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          background: "var(--bg-input)",
                          border: "1px solid var(--border-strong)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="demo@rakshak.ai"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-strong)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Password</label>
                    </div>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Rakshak@2026"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-strong)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    />
                  </div>

                  {loginError && (
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", fontSize: "0.78rem", marginBottom: "0.85rem", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                      ⚠️ {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    style={{
                      width: "100%",
                      padding: "11px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #059669, #047857)",
                      border: "none",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                      marginBottom: "0.5rem",
                      boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)",
                    }}
                  >
                    {isLoggingIn ? "Signing in..." : "Sign In with Email"}
                  </button>
                </form>

                {/* Divider */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    margin: "1rem 0",
                    color: "var(--text-muted)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                  <span>OR WITH GOOGLE</span>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                </div>

                {/* Google Official Button (BELOW) */}
                <button
                  onClick={triggerGooglePrompt}
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: "12px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            ) : (
              /* Step 2: Role & Purpose Selection */
              <div>
                <div style={{ marginBottom: "1.25rem" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 6, background: "var(--accent-subtle)", color: "var(--accent-primary)", fontSize: "0.72rem", fontWeight: 800 }}>
                    STEP 2 OF 2 • PURPOSE SELECTION
                  </span>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", margin: "6px 0 2px" }}>
                    Select Your Travel Persona
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                    Tailors route prioritization, risk multipliers & emergency networks.
                  </p>
                </div>

                {/* 4 Large Selectable Role Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1.25rem" }}>
                  {(["citizen", "corporate", "emergency", "police"] as UserFieldKey[]).map((fieldKey) => {
                    const info = USER_FIELDS[fieldKey];
                    const isSelected = selectedField === fieldKey;
                    return (
                      <button
                        key={fieldKey}
                        onClick={() => setSelectedField(fieldKey)}
                        style={{
                          padding: "10px",
                          borderRadius: 12,
                          background: isSelected ? "var(--accent-subtle)" : "var(--bg-card)",
                          border: isSelected ? `2px solid var(--accent-primary)` : "1px solid var(--border-subtle)",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        <div style={{ fontSize: "1.25rem", marginBottom: 2 }}>{info.icon}</div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>{info.title}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.2 }}>{info.tagline}</div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleFinalConfirm}
                  disabled={isLoggingIn}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #059669, #047857)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(5, 150, 105, 0.35)",
                  }}
                >
                  {isLoggingIn ? "Launching Platform..." : "🛡️ Enter Rakshak Safety Dashboard"}
                </button>
              </div>
            )}

            {/* Bottom Footer Tags */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", marginTop: "1rem", display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              <span>🔒 AES-256 Encrypted</span>
              <span>DPDP Act 2023 Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
