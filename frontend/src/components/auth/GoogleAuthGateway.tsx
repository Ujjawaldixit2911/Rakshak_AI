"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth, USER_FIELDS, UserFieldKey } from "@/context/AuthContext";

const DEMO_GOOGLE_ACCOUNTS = [
  {
    name: "Ujjawal Dixit",
    email: "ujjawaldixit@gmail.com",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@gmail.com",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  },
  {
    name: "Vikram Malhotra",
    email: "vikram.malhotra@gmail.com",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
  },
];

export default function GoogleAuthGateway() {
  const { loginWithGoogle } = useAuth();

  const [authMethod, setAuthMethod] = useState<"google" | "email">("google");
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Auth, Step 2: Select Field
  const [selectedAccount, setSelectedAccount] = useState<{
    name: string;
    email: string;
    avatar: string;
  } | null>(null);

  // Email form state
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [mockGeneratedOtp, setMockGeneratedOtp] = useState("");

  // Custom Google input
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [isCustomGoogleMode, setIsCustomGoogleMode] = useState(false);

  // Field selection
  const [selectedField, setSelectedField] = useState<UserFieldKey>("citizen");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showConfigHelper, setShowConfigHelper] = useState(false);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const isRealGoogleConfigured =
    googleClientId && !googleClientId.includes("your-google-client-id");

  // Load Google Identity Services script if configured
  useEffect(() => {
    if (typeof window === "undefined" || !isRealGoogleConfigured) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google && googleBtnContainerRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            try {
              // Parse JWT credential
              const payload = JSON.parse(
                atob(response.credential.split(".")[1])
              );
              setSelectedAccount({
                name: payload.name || payload.email.split("@")[0],
                email: payload.email,
                avatar:
                  payload.picture ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                    payload.email
                  )}`,
              });
              setStep(2);
            } catch (e) {
              console.error("Failed to parse Google JWT credential:", e);
            }
          },
        });

        (window as any).google.accounts.id.renderButton(
          googleBtnContainerRef.current,
          {
            theme: "filled_blue",
            size: "large",
            shape: "pill",
            text: "signin_with",
            width: 320,
          }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [googleClientId, isRealGoogleConfigured]);

  // Demo Google account selection
  const handleSelectDemoGoogle = (acc: typeof DEMO_GOOGLE_ACCOUNTS[0]) => {
    setSelectedAccount(acc);
    setStep(2);
  };

  // Custom Google submission
  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail) return;
    const name = customGoogleName.trim() || customGoogleEmail.split("@")[0];
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      customGoogleEmail
    )}`;
    setSelectedAccount({ name, email: customGoogleEmail, avatar });
    setStep(2);
  };

  // Email login handling
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setMockGeneratedOtp(randomOtp);
    setOtpSent(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    const name = nameInput.trim() || emailInput.split("@")[0];
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      emailInput
    )}`;
    setSelectedAccount({ name, email: emailInput, avatar });
    setStep(2);
  };

  // Final confirmation to unlock platform
  const handleCompleteLogin = () => {
    if (!selectedAccount) return;
    setIsLoggingIn(true);
    setTimeout(() => {
      loginWithGoogle(selectedAccount, selectedField);
      setIsLoggingIn(false);
    }, 400);
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem 4rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 650,
          height: 650,
          background:
            "radial-gradient(circle, rgba(79,124,255,0.12) 0%, rgba(168,85,247,0.06) 50%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          maxWidth: 960,
          width: "100%",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              background: "rgba(79, 124, 255, 0.1)",
              border: "1px solid rgba(79, 124, 255, 0.25)",
              borderRadius: 99,
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>🛡️</span>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#93c5fd",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Rakshak AI · Public Safety Intelligence
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: "0.75rem",
              background:
                "linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {step === 1
              ? "Sign in to Unlock Public Safety & Navigation Intelligence"
              : "Select Your Field & Purpose of Use"}
          </h1>

          <p
            style={{
              fontSize: "clamp(0.9rem, 2vw, 1.05rem)",
              color: "#94a3b8",
              maxWidth: 640,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            {step === 1
              ? "Home page ke AI safe route navigators, crime heatmaps aur SOS ko unlock karne ke liye Google ya Email se login karein."
              : "Aap kis field ke liye login kar rahe hain? Apna role chunein taki platform aapke focus ke anusaar customize ho jaye."}
          </p>
        </div>

        {/* Step Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background:
                step === 1
                  ? "rgba(79, 124, 255, 0.2)"
                  : "rgba(34, 197, 94, 0.15)",
              border: `1px solid ${
                step === 1 ? "#4f7cff" : "rgba(34, 197, 94, 0.4)"
              }`,
              color: step === 1 ? "#93c5fd" : "#86efac",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            <span>{step > 1 ? "✓" : "1"}</span>
            <span>Authentication (Google / Email)</span>
          </div>
          <div
            style={{ width: 24, height: 1, background: "rgba(255,255,255,0.2)" }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background:
                step === 2
                  ? "rgba(168, 85, 247, 0.25)"
                  : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${
                step === 2 ? "#a855f7" : "rgba(255, 255, 255, 0.1)"
              }`,
              color: step === 2 ? "#e9d5ff" : "#64748b",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            <span>2</span>
            <span>Choose Your Field / Purpose</span>
          </div>
        </div>

        {/* ── STEP 1: Auth Modal Card ────────────────────────────────────── */}
        {step === 1 && (
          <div
            style={{
              maxWidth: 490,
              margin: "0 auto",
              background: "rgba(13, 24, 41, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 20,
              padding: "1.75rem 2rem",
              boxShadow:
                "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(79, 124, 255, 0.15)",
            }}
          >
            {/* Method Switcher Tabs */}
            <div
              style={{
                display: "flex",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: 4,
                marginBottom: "1.5rem",
              }}
            >
              <button
                type="button"
                onClick={() => setAuthMethod("google")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background:
                    authMethod === "google" ? "#4f7cff" : "transparent",
                  color: authMethod === "google" ? "#fff" : "#94a3b8",
                  transition: "all 0.2s",
                }}
              >
                <GoogleIcon size={16} />
                <span>Google Login</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMethod("email")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background:
                    authMethod === "email" ? "#4f7cff" : "transparent",
                  color: authMethod === "email" ? "#fff" : "#94a3b8",
                  transition: "all 0.2s",
                }}
              >
                <span>✉️</span>
                <span>Email Login</span>
              </button>
            </div>

            {/* ── GOOGLE AUTH METHOD ─────────────────────────────── */}
            {authMethod === "google" && (
              <div>
                {/* Real Google GSI Button Container if configured */}
                {isRealGoogleConfigured && (
                  <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
                    <div
                      ref={googleBtnContainerRef}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        minHeight: 44,
                      }}
                    />
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "#22c55e",
                        marginTop: 6,
                        fontWeight: 600,
                      }}
                    >
                      ✓ Live Google Cloud Client ID connected
                    </div>
                  </div>
                )}

                {/* Demo Google Profiles */}
                {!isCustomGoogleMode ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      marginBottom: "1.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "#64748b",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Choose Google Account:
                    </span>
                    {DEMO_GOOGLE_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        onClick={() => handleSelectDemoGoogle(acc)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: 12,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s",
                          width: "100%",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(79, 124, 255, 0.12)";
                          e.currentTarget.style.borderColor =
                            "rgba(79, 124, 255, 0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.04)";
                          e.currentTarget.style.borderColor =
                            "rgba(255, 255, 255, 0.08)";
                        }}
                      >
                        <img
                          src={acc.avatar}
                          alt={acc.name}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "0.88rem",
                              fontWeight: 700,
                              color: "#f1f5f9",
                            }}
                          >
                            {acc.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#94a3b8",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {acc.email}
                          </div>
                        </div>
                        <GoogleIcon size={18} />
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setIsCustomGoogleMode(true)}
                      style={{
                        marginTop: 4,
                        padding: "8px",
                        background: "transparent",
                        border: "1px dashed rgba(255, 255, 255, 0.15)",
                        borderRadius: 10,
                        color: "#93c5fd",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      + Enter Custom Google Email
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleCustomGoogleSubmit}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        className="input-dark"
                        placeholder="e.g. Ujjawal Dixit"
                        value={customGoogleName}
                        onChange={(e) => setCustomGoogleName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Google Email Address
                      </label>
                      <input
                        type="email"
                        className="input-dark"
                        required
                        placeholder="yourname@gmail.com"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setIsCustomGoogleMode(false)}
                        className="btn-outline"
                        style={{ flex: 1, fontSize: "0.82rem" }}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ flex: 2, fontSize: "0.82rem" }}
                      >
                        Sign in with Google
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ── EMAIL AUTH METHOD ─────────────────────────────── */}
            {authMethod === "email" && (
              <div>
                {!otpSent ? (
                  <form
                    onSubmit={handleSendOtp}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Your Name
                      </label>
                      <input
                        type="text"
                        className="input-dark"
                        placeholder="e.g. Ujjawal Dixit"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="input-dark"
                        required
                        placeholder="name@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ marginTop: 6, fontSize: "0.88rem" }}
                    >
                      Send Verification Code (OTP) →
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleVerifyOtp}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(34, 197, 94, 0.12)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#86efac",
                          fontWeight: 700,
                        }}
                      >
                        ✓ Code Sent to {emailInput}
                      </div>
                      <div
                        style={{
                          fontSize: "0.74rem",
                          color: "#cbd5e1",
                          marginTop: 2,
                        }}
                      >
                        Your demo verification code is:{" "}
                        <strong
                          style={{
                            color: "#fff",
                            background: "rgba(0,0,0,0.3)",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {mockGeneratedOtp}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        className="input-dark"
                        required
                        placeholder={mockGeneratedOtp}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        style={{
                          letterSpacing: "4px",
                          textAlign: "center",
                          fontSize: "1.1rem",
                          fontWeight: 800,
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="btn-outline"
                        style={{ flex: 1, fontSize: "0.82rem" }}
                      >
                        Change Email
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ flex: 2, fontSize: "0.85rem" }}
                      >
                        Verify & Proceed →
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* API Key / Cloud Console Link Helper */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setShowConfigHelper(!showConfigHelper)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#93c5fd",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>🔑</span>
                <span>
                  {showConfigHelper
                    ? "Hide Google API Key Guide"
                    : "Google Cloud Client ID Guide & Links"}
                </span>
              </button>

              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                OAuth 2.0 / SSL
              </span>
            </div>

            {showConfigHelper && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: "0.74rem",
                  color: "#cbd5e1",
                  lineHeight: 1.45,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#f8fafc",
                    marginBottom: 4,
                  }}
                >
                  🌐 Google Cloud Console se API Key / Client ID kaise lein:
                </div>
                <ol style={{ paddingLeft: 16, margin: "4px 0" }}>
                  <li>
                    Google Cloud Console me jayein:{" "}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#60a5fa", textDecoration: "underline" }}
                    >
                      console.cloud.google.com/apis/credentials
                    </a>
                  </li>
                  <li>
                    <strong>Create Credentials → OAuth client ID</strong> chunein
                    (Application Type: <em>Web Application</em>).
                  </li>
                  <li>
                    Authorized JavaScript Origins me <code>http://localhost:3000</code>{" "}
                    add karein.
                  </li>
                  <li>
                    Client ID copy karke apne <code>frontend/.env.local</code> me{" "}
                    <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> me paste karein.
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Choose Field / Purpose ───────────────────────────────── */}
        {step === 2 && (
          <div
            style={{
              background: "rgba(13, 24, 41, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 18,
              padding: "2rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* User identification bar */}
            {selectedAccount && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  marginBottom: "1.5rem",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img
                    src={selectedAccount.avatar}
                    alt={selectedAccount.name}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#f8fafc",
                      }}
                    >
                      {selectedAccount.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginLeft: 8,
                      }}
                    >
                      ({selectedAccount.email})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(1)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#93c5fd",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Change Account
                </button>
              </div>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  margin: 0,
                  color: "#f8fafc",
                }}
              >
                Aap kis Field / Category ke liye login kar rahe hain?
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#94a3b8",
                  marginTop: 4,
                }}
              >
                Aapka chuna hua field dashboard ko aapki zaroorat ke anusaar
                optimize karega.
              </p>
            </div>

            {/* Field Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
                gap: 14,
                marginBottom: "1.75rem",
              }}
            >
              {(Object.keys(USER_FIELDS) as UserFieldKey[]).map((key) => {
                const item = USER_FIELDS[key];
                const isSelected = selectedField === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedField(key)}
                    style={{
                      padding: "1rem",
                      borderRadius: 14,
                      background: isSelected
                        ? item.bgGlow
                        : "rgba(255, 255, 255, 0.03)",
                      border: `1.5px solid ${
                        isSelected ? item.color : "rgba(255, 255, 255, 0.08)"
                      }`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      position: "relative",
                      boxShadow: isSelected ? `0 0 20px ${item.bgGlow}` : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
                        <div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              color: isSelected ? "#fff" : "#e2e8f0",
                            }}
                          >
                            {item.title}
                          </div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: item.color,
                              fontWeight: 700,
                            }}
                          >
                            {item.badge}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: `2px solid ${
                            isSelected ? item.color : "rgba(255,255,255,0.2)"
                          }`,
                          background: isSelected ? item.color : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "0.7rem",
                          fontWeight: 900,
                        }}
                      >
                        {isSelected && "✓"}
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: "0.76rem",
                        color: "#94a3b8",
                        lineHeight: 1.4,
                        margin: "6px 0 10px",
                      }}
                    >
                      {item.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {item.primaryFeatures.map((feat, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.71rem",
                            color: "#cbd5e1",
                          }}
                        >
                          <span
                            style={{ color: item.color, fontSize: "0.75rem" }}
                          >
                            •
                          </span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confirmation Action */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                paddingTop: "1.25rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Selected Field:{" "}
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    color: USER_FIELDS[selectedField].color,
                  }}
                >
                  {USER_FIELDS[selectedField].icon}{" "}
                  {USER_FIELDS[selectedField].title}
                </span>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-outline"
                  style={{ padding: "0.65rem 1.25rem", fontSize: "0.85rem" }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCompleteLogin}
                  disabled={isLoggingIn}
                  className="btn-primary"
                  style={{
                    padding: "0.65rem 2rem",
                    fontSize: "0.9rem",
                    background:
                      "linear-gradient(135deg, #4f7cff 0%, #6366f1 100%)",
                    boxShadow: "0 0 20px rgba(79, 124, 255, 0.4)",
                  }}
                >
                  {isLoggingIn ? "Opening Portal..." : "Enter Safety Portal →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}
