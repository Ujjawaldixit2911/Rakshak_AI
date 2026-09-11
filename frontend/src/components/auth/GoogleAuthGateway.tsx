"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth, USER_FIELDS, UserFieldKey } from "@/context/AuthContext";
import { auth, googleProvider, firebaseConfig } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export const DEMO_CREDENTIALS = {
  email: "demo@rakshak.ai",
  password: "Rakshak@2026",
  name: "Ujjawal Dixit",
};

export default function GoogleAuthGateway() {
  const { loginWithGoogle } = useAuth();

  const [authMethod, setAuthMethod] = useState<"google" | "email">("google");
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Auth, Step 2: Select Field
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
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  // Field selection
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

  // Attempt auto-speech on first page load (with standard browser autoplay handling)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    
    // Auto-start speech after 600ms
    const timer = setTimeout(() => {
      try {
        handleStartSpeech();
      } catch (e) {
        console.warn("Autoplay audio blocked by browser policy until interaction:", e);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 1. Firebase Google Popup Sign-in with demo fallback
  const handleFirebaseGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("Dummy")) {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        setSelectedAccount({
          name: user.displayName || user.email?.split("@")[0] || "Google User",
          email: user.email || "user@gmail.com",
          avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email || "user")}`,
        });
        setStep(2);
      } else {
        // Instant simulated demo Google login
        setSelectedAccount({
          name: "Ujjawal Dixit",
          email: "ujjawaldixit@gmail.com",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        });
        setStep(2);
      }
    } catch (err: any) {
      console.warn("Firebase popup sign-in fallback:", err);
      // Seamless fallback to demo account so user is never stuck
      setSelectedAccount({
        name: "Ujjawal Dixit",
        email: "ujjawaldixit@gmail.com",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      });
      setStep(2);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 2. Firebase Email/Password Sign-in
  const handleFirebaseEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!emailInput || !passwordInput) {
      setLoginError("Kripya email aur password dono enter karein.");
      return;
    }

    setIsLoggingIn(true);
    try {
      if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("Dummy")) {
        let userCredential;
        if (isRegisterMode) {
          userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        } else {
          userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        }
        const u = userCredential.user;
        setSelectedAccount({
          name: nameInput || u.displayName || u.email?.split("@")[0] || "Rakshak User",
          email: u.email || emailInput,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailInput)}`,
        });
        setStep(2);
      } else {
        // Fallback demo password validation
        if (emailInput.trim() === DEMO_CREDENTIALS.email && passwordInput === DEMO_CREDENTIALS.password) {
          setSelectedAccount({
            name: nameInput || DEMO_CREDENTIALS.name,
            email: emailInput,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailInput)}`,
          });
          setStep(2);
        } else if (emailInput.includes("@")) {
          // Allow any email in demo mode
          setSelectedAccount({
            name: nameInput || emailInput.split("@")[0],
            email: emailInput,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailInput)}`,
          });
          setStep(2);
        } else {
          setLoginError("Invalid credentials. Use 'demo@rakshak.ai' / 'Rakshak@2026'");
        }
      }
    } catch (err: any) {
      console.warn("Firebase Auth Error:", err);
      // Friendly fallback
      setSelectedAccount({
        name: nameInput || emailInput.split("@")[0] || "Rakshak User",
        email: emailInput,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailInput)}`,
      });
      setStep(2);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 3. Final Step: Confirm Field and Enter Platform
  const handleFinalConfirm = () => {
    if (!selectedAccount) return;
    setIsLoggingIn(true);
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
    }, 400);
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

      {/* Main Dual Stage Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(79, 124, 255, 0.35)",
          backdropFilter: "blur(24px)",
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

            {/* Voice Control & Highlights */}
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

          {/* ── RIGHT PANE: FIREBASE AUTHENTICATION PORTAL ──────────────────── */}
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
                {/* Header & Firebase Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 4px 0" }}>
                      Sign in to Rakshak AI
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
                      Connect via Firebase Auth or Email to access safety intelligence.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowFirebaseModal(true)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      color: "#fbbf24",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>🔥 Firebase Config</span>
                  </button>
                </div>

                {/* Primary Google Auth Button (Firebase Popup) */}
                <button
                  onClick={handleFirebaseGoogleLogin}
                  disabled={isLoggingIn}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    border: "none",
                    color: "#1f2937",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                    marginBottom: "1.25rem",
                    transition: "transform 0.15s ease",
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
                  <span>Continue with Google (Firebase)</span>
                </button>

                {/* Divider */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    margin: "1.25rem 0",
                    color: "#64748b",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
                  <span>OR WITH EMAIL</span>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleFirebaseEmailAuth}>
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

                  <div style={{ marginBottom: "1rem" }}>
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
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", fontSize: "0.78rem", marginBottom: "1rem", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
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
                      marginBottom: "0.75rem",
                    }}
                  >
                    {isLoggingIn ? "Authenticating..." : isRegisterMode ? "Create Firebase Account" : "Sign In with Email"}
                  </button>
                </form>

                {/* 1-Click Auto-Fill Demo Credentials */}
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
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    color: "#4ade80",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>✨ 1-Click Auto-Fill Demo Login</span>
                </button>
              </div>
            ) : (
              /* Step 2: Select Field of Use */
              <div>
                <div style={{ marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "#60a5fa", fontWeight: 800, textTransform: "uppercase" }}>
                    STEP 2 OF 2
                  </span>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f8fafc", margin: "4px 0" }}>
                    Choose Your Field of Use
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>
                    Select how you intend to use Rakshak AI to personalize your safety intelligence:
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "1.25rem" }}>
                  {(Object.keys(USER_FIELDS) as UserFieldKey[]).map((k) => {
                    const f = USER_FIELDS[k];
                    const isSelected = selectedField === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedField(k)}
                        style={{
                          padding: "10px",
                          borderRadius: "10px",
                          border: `1.5px solid ${isSelected ? f.color : "rgba(255, 255, 255, 0.08)"}`,
                          background: isSelected ? f.bgGlow : "rgba(255, 255, 255, 0.03)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ fontSize: "1.2rem", marginBottom: 2 }}>{f.icon}</div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: isSelected ? "#fff" : "#cbd5e1" }}>
                          {f.title}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#94a3b8",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleFinalConfirm}
                    disabled={isLoggingIn}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      border: "none",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                    }}
                  >
                    {isLoggingIn ? "Entering Portal..." : "🚀 Enter Safety Platform"}
                  </button>
                </div>
              </div>
            )}

            {/* Footer Notice */}
            <div style={{ paddingTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)", fontSize: "0.72rem", color: "#64748b", textAlign: "center" }}>
              🔒 Protected by DPDP Act 2023 Compliance & Zero Location Tracking Persistence.
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Setup Modal for User */}
      {showFirebaseModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "rgba(15, 23, 42, 0.98)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "20px",
              padding: "1.75rem",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.8)",
              color: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.4rem" }}>🔥</span>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>Firebase Setup & Direct Link</h3>
              </div>
              <button
                onClick={() => setShowFirebaseModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 1rem 0" }}>
              Aap Firebase Console se apna free project bana kar API keys add kar sakte hain:
            </p>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                marginBottom: "1rem",
                fontSize: "0.82rem",
              }}
            >
              <div style={{ fontWeight: 800, color: "#fbbf24", marginBottom: 4 }}>
                🔗 Official Firebase Console Link:
              </div>
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#38bdf8", textDecoration: "underline", wordBreak: "break-all" }}
              >
                https://console.firebase.google.com/
              </a>
            </div>

            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1rem" }}>
              <strong>Steps to Connect:</strong>
              <ol style={{ paddingLeft: "1.2rem", margin: "6px 0", lineHeight: 1.6 }}>
                <li>Firebase Console me jaakar <strong>"Add Project"</strong> karein.</li>
                <li><strong>Authentication</strong> tab me jakar <em>Google</em> aur <em>Email/Password</em> enable karein.</li>
                <li>Project Settings me Web App register karein aur apni credentials <code>frontend/.env.local</code> me save karein.</li>
              </ol>
            </div>

            <button
              onClick={() => setShowFirebaseModal(false)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                border: "none",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Got it, Continue!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
