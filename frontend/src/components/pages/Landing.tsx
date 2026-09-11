"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth, USER_FIELDS, UserFieldKey } from "@/context/AuthContext";

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
  const [voiceLanguage, setVoiceLanguage] = useState<"hindi" | "english">("hindi");
  const [captionIdx, setCaptionIdx] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const hindiDialogue = [
    "Namaste! Main hoon aapka Rakshak AI Safety Navigator.",
    "Conventional maps aapko sirf sabse chhota ya fastest rasta dikhate hain, chahe wo kitna bhi sunsaan ya khatarnak kyu na ho.",
    "Lekin Rakshak AI par hum real-time crime incidents, unlit blindspots, aur accident zones ko bypass karte hain.",
    "Chahe do minute extra lagein, par hum aapko sabse safe aur fully illuminated route provide karenge!",
    "Now you can login and explore the live safety map. Chaliye shuru karte hain!"
  ];

  const englishDialogue = [
    "Hello! I am your Rakshak AI Safety Navigator.",
    "Standard navigation apps only focus on the shortest or fastest path, even if it takes you through dark and risky alleys.",
    "Rakshak AI analyzes real crime hotspots, street lighting, and police patrolling to compute the safest possible route.",
    "Even if it takes 2 minutes more, we ensure you always reach your destination safely and securely.",
    "Now you can log in to explore the live safety platform. Let's get started!"
  ];

  const activeDialogue = voiceLanguage === "hindi" ? hindiDialogue : englishDialogue;

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
      voices.find((v) => (v.lang === "hi-IN" || v.lang === "hi_IN") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("India"))) ||
      voices.find((v) => v.lang.startsWith("hi")) ||
      voices.find((v) => (v.lang === "en-IN" || v.lang.includes("India")) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Rishi") || v.name.includes("Prabhat"))) ||
      voices.find((v) => v.lang.startsWith("en-IN")) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) utterance.voice = naturalVoice;
    utterance.lang = voiceLanguage === "hindi" ? "hi-IN" : "en-IN";
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
  }, [voiceLanguage]);

  // Direct Google Sign-In Trigger
  const triggerGooglePrompt = () => {
    handleStopSpeech();
    setSelectedAccount({
      name: "Ujjawal Dixit",
      email: "ujjawal.rakshak@gmail.com",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ujjawal",
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
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailInput)}`,
      });
      setStep(2);
    } else if (emailInput.includes("@")) {
      setSelectedAccount({
        name: nameInput || emailInput.split("@")[0],
        email: emailInput,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailInput)}`,
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
        background: "radial-gradient(circle at 50% 20%, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.98) 70%, #030712 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Background Animated Blobs */}
      <div
        style={{
          position: "absolute",
          top: "-150px",
          left: "-100px",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Main Large Dual Stage Container (1200px Big Box) */}
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(79, 124, 255, 0.35)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "28px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 50px rgba(59, 130, 246, 0.15)",
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
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              borderRight: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
            }}
          >
            <div>
              {/* Top Mission Pill & Language Switcher */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: "rgba(59, 130, 246, 0.2)",
                      color: "#60a5fa",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      border: "1px solid rgba(59, 130, 246, 0.35)",
                    }}
                  >
                    🛡️ RAKSHAK AI PLATFORM
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: 8,
                    padding: 2,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <button
                    onClick={() => {
                      handleStopSpeech();
                      setVoiceLanguage("hindi");
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: voiceLanguage === "hindi" ? "#3b82f6" : "transparent",
                      color: voiceLanguage === "hindi" ? "#fff" : "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🇮🇳 हिंदी
                  </button>
                  <button
                    onClick={() => {
                      handleStopSpeech();
                      setVoiceLanguage("english");
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: voiceLanguage === "english" ? "#3b82f6" : "transparent",
                      color: voiceLanguage === "english" ? "#fff" : "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🇬🇧 English
                  </button>
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
                    border: isPlayingVoice ? "2.5px solid #38bdf8" : "2px solid rgba(79, 124, 255, 0.4)",
                    boxShadow: isPlayingVoice
                      ? "0 0 30px rgba(56, 189, 248, 0.5), 0 10px 25px rgba(0,0,0,0.6)"
                      : "0 10px 25px rgba(0,0,0,0.5)",
                    background: "#0f172a",
                    position: "relative",
                  }}
                >
                  <img
                    src="/assets/presenter_character.jpg"
                    alt="Rakshak AI Presenter"
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
                        background: "rgba(16, 185, 129, 0.9)",
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
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                    "Navigate Smart. Stay Safe."
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0, lineHeight: 1.45 }}>
                    Meet your personal AI Safety Navigator. We replace risky shortcuts with verified, well-lit, police-patrolled safe corridors.
                  </p>
                </div>
              </div>

              {/* Speech Teleprompter Bubble */}
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "16px",
                  background: "rgba(30, 41, 59, 0.45)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.1rem" }}>🎙️</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase" }}>
                    {voiceLanguage === "hindi" ? "Safety Navigator ka Sandesh" : "Navigator Message"}
                  </span>
                </div>
                <div style={{ fontSize: "0.95rem", color: "#f1f5f9", lineHeight: 1.55, fontWeight: 500, minHeight: "75px" }}>
                  <span style={{ color: "#38bdf8", fontWeight: 800 }}>"</span>
                  <span style={{ color: "#e2e8f0" }}>
                    {activeDialogue[captionIdx] || activeDialogue[0]}
                  </span>
                  <span style={{ color: "#38bdf8", fontWeight: 800 }}>"</span>
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
                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(59, 130, 246, 0.35)",
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
              background: "rgba(15, 23, 42, 0.5)",
            }}
          >
            {step === 1 ? (
              <div>
                {/* Header */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", fontSize: "0.72rem", fontWeight: 800 }}>
                      IDENTITY & ACCESS GATEWAY
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f8fafc", margin: "4px 0" }}>
                    Sign in to Rakshak AI
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
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
                    background: "rgba(34, 197, 94, 0.14)",
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    color: "#4ade80",
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
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>
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
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#fff",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>
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
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Password</label>
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
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    />
                  </div>

                  {loginError && (
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", fontSize: "0.78rem", marginBottom: "0.85rem", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
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
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      border: "none",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                      marginBottom: "0.5rem",
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
                    color: "#64748b",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
                  <span>OR WITH GOOGLE</span>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
                </div>

                {/* Google Official Button (BELOW) */}
                <button
                  onClick={triggerGooglePrompt}
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    border: "none",
                    color: "#1f2937",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
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
                  <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", fontSize: "0.72rem", fontWeight: 800 }}>
                    STEP 2 OF 2 • PURPOSE SELECTION
                  </span>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f8fafc", margin: "6px 0 2px" }}>
                    Select Your Travel Persona
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>
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
                          background: isSelected ? info.bgGlow : "rgba(255, 255, 255, 0.04)",
                          border: isSelected ? `2px solid ${info.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ fontSize: "1.25rem", marginBottom: 2 }}>{info.icon}</div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff" }}>{info.title}</div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2, lineHeight: 1.2 }}>{info.tagline}</div>
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
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)",
                  }}
                >
                  {isLoggingIn ? "Launching Platform..." : "🚀 Enter Rakshak AI Dashboard"}
                </button>
              </div>
            )}

            {/* Bottom Footer Tags */}
            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem", marginTop: "1rem", display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748b" }}>
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
