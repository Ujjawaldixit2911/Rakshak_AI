"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import VoiceInputButton from "./VoiceInputButton";

interface RakshakAICopilotProps {
  city: string;
  routeData?: any | null;
  onApplyRoute?: (origin: [number, number], dest: [number, number], originName: string, destName: string) => void;
  onSelectCity?: (city: string) => void;
  onTriggerSOS?: () => void;
  onOpenReport?: (lat?: number, lon?: number) => void;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  action?: string | null;
  actionData?: any;
  engine?: string;
}

export default function RakshakAICopilot({
  city,
  routeData,
  onApplyRoute,
  onSelectCity,
  onTriggerSOS,
  onOpenReport,
}: RakshakAICopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "traverser">("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 **Namaste! Main Rakshak AI Copilot hoon.**\n\nAap mujhse **voice** ya text me route pooch sakte hain (*'CP se Saket ka safe rasta'*), area safety score jaan sakte hain, ya project ML models samajh sakte hain. Bolkar try karein! 🎙️",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Route Traverser State
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isTraversing, setIsTraversing] = useState(false);
  const [traverseSummary, setTraverseSummary] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  // Text to Speech
  const speakText = (text: string) => {
    if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]()]/g, "").replace(/https?:\/\/\S+/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Load Route Guidance when routeData changes
  useEffect(() => {
    if (routeData?.safest_route?.coordinates && routeData.safest_route.coordinates.length > 1) {
      const fetchGuidance = async () => {
        try {
          const res = await api.getRouteGuidance(
            city,
            routeData.safest_route.coordinates,
            "Start Point",
            "Destination Point",
            "safest"
          );
          setRouteSteps(res.steps || []);
          setTraverseSummary(res.overall_summary || "");
          setCurrentStepIdx(0);
        } catch (e) {
          console.error("Failed to load route guidance:", e);
        }
      };
      fetchGuidance();
    }
  }, [routeData, city]);

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputValue).trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-5).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await api.assistantChat(text, city, historyPayload);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: res.response,
        action: res.action,
        actionData: res.action_data,
        engine: res.engine,
      };

      setMessages((prev) => [...prev, botMsg]);
      speakText(res.response);

      // Execute Action if suggested
      if (res.action === "SET_ROUTE" && res.action_data && onApplyRoute) {
        onApplyRoute(
          res.action_data.origin,
          res.action_data.destination,
          res.action_data.origin_name,
          res.action_data.dest_name
        );
      } else if (res.action === "TRIGGER_SOS" && onTriggerSOS) {
        onTriggerSOS();
      } else if (res.action === "OPEN_REPORT_MODAL" && onOpenReport) {
        onOpenReport();
      } else if (res.action === "SET_CITY" && res.action_data?.city && onSelectCity) {
        onSelectCity(res.action_data.city);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "⚠️ Connection issue with AI engine. Rakshak AI models are functioning normally on the map.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Traversal Step Progress
  const nextTraversalStep = () => {
    if (currentStepIdx < routeSteps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      speakText(`${routeSteps[nextIdx].title}. ${routeSteps[nextIdx].guidance}`);
    } else {
      setIsTraversing(false);
      speakText("You have safely completed your journey.");
    }
  };

  const startTraversal = () => {
    if (routeSteps.length === 0) return;
    setIsTraversing(true);
    setCurrentStepIdx(0);
    speakText(`Starting journey. ${routeSteps[0].title}. ${routeSteps[0].guidance}`);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        id="rakshak-copilot-launcher"
        onClick={() => setIsOpen(!isOpen)}
        title="Open Rakshak AI Copilot"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 20px",
          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "50px",
          boxShadow: "0 8px 32px rgba(59, 130, 246, 0.4)",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "14px",
          backdropFilter: "blur(8px)",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: isOpen ? "scale(0.95)" : "scale(1)",
        }}
      >
        <span style={{ fontSize: "18px" }}>🎙️</span>
        <span>Rakshak AI Copilot</span>
        {routeData && (
          <span
            style={{
              padding: "2px 7px",
              background: "#22c55e",
              borderRadius: "10px",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            ROUTE READY
          </span>
        )}
      </button>

      {/* Glassmorphism Chat & Traversal Panel */}
      {isOpen && (
        <div
          id="rakshak-copilot-modal"
          style={{
            position: "fixed",
            bottom: "84px",
            right: "24px",
            zIndex: 9999,
            width: "420px",
            maxWidth: "calc(100vw - 32px)",
            height: "580px",
            maxHeight: "calc(100vh - 120px)",
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: "#f8fafc",
            fontFamily: "inherit",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(30, 41, 59, 0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                🤖
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Rakshak AI Copilot</h3>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  Powered by Groq Whisper & LLaMA 3.3
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                title={ttsEnabled ? "Mute Voice Speech" : "Enable Voice Speech"}
                style={{
                  background: "transparent",
                  border: "none",
                  color: ttsEnabled ? "#38bdf8" : "#64748b",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "4px",
                }}
              >
                {ttsEnabled ? "🔊" : "🔇"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "14px",
                  width: "28px",
                  height: "28px",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              background: "rgba(15, 23, 42, 0.8)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "4px 12px",
              gap: "8px",
            }}
          >
            <button
              onClick={() => setActiveTab("chat")}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "none",
                borderRadius: "8px",
                background: activeTab === "chat" ? "rgba(59, 130, 246, 0.25)" : "transparent",
                color: activeTab === "chat" ? "#60a5fa" : "#94a3b8",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              💬 AI Safety Assistant
            </button>
            <button
              onClick={() => setActiveTab("traverser")}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "none",
                borderRadius: "8px",
                background: activeTab === "traverser" ? "rgba(34, 197, 94, 0.2)" : "transparent",
                color: activeTab === "traverser" ? "#4ade80" : "#94a3b8",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              🚗 Route Traverser {routeSteps.length > 0 && `(${routeSteps.length})`}
            </button>
          </div>

          {/* Tab 1: Chat View */}
          {activeTab === "chat" && (
            <>
              <div
                style={{
                  flex: 1,
                  padding: "16px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      padding: "12px 16px",
                      borderRadius:
                        m.sender === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background:
                        m.sender === "user"
                          ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                          : "rgba(30, 41, 59, 0.85)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      fontSize: "13.5px",
                      lineHeight: "1.55",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {m.text}

                    {m.action && (
                      <div
                        style={{
                          marginTop: "8px",
                          paddingTop: "6px",
                          borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                          fontSize: "11px",
                          color: "#38bdf8",
                          fontWeight: 600,
                        }}
                      >
                        ⚡ Action Dispatched: {m.action}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      padding: "10px 16px",
                      borderRadius: "14px",
                      background: "rgba(30, 41, 59, 0.8)",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    🧠 Rakshak AI is thinking & computing route safety...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompts */}
              <div
                style={{
                  padding: "8px 16px",
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {[
                  "CP se Saket safe route",
                  "Safety Score formula?",
                  "Show DBSCAN algorithms",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendMessage(chip)}
                    style={{
                      padding: "4px 10px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "20px",
                      color: "#cbd5e1",
                      fontSize: "11px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(15, 23, 42, 0.95)",
                }}
              >
                <VoiceInputButton
                  onResult={(text) => {
                    setInputValue(text);
                    handleSendMessage(text);
                  }}
                  title="Speak into Whisper AI mic"
                />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask anything or say 'CP to Saket'..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.07)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || loading}
                  style={{
                    padding: "10px 16px",
                    background: "#3b82f6",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Send
                </button>
              </div>
            </>
          )}

          {/* Tab 2: Interactive Route Traverser View */}
          {activeTab === "traverser" && (
            <div
              style={{
                flex: 1,
                padding: "20px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {routeSteps.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>🗺️</div>
                  <h4 style={{ margin: "0 0 6px 0", color: "#f8fafc" }}>No Active Route Selected</h4>
                  <p style={{ fontSize: "12.5px", lineHeight: "1.5" }}>
                    Map par <strong>Find Safe Route</strong> par click karein ya AI Copilot me bolkar rasta set karein.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(34, 197, 94, 0.15)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#86efac",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>🛡️</span>
                    <span>{traverseSummary || "Safe corridor active with 0 hotspot overlap."}</span>
                  </div>

                  {/* Active Step Card */}
                  {routeSteps[currentStepIdx] && (
                    <div
                      style={{
                        padding: "18px",
                        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        borderRadius: "14px",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 8px",
                            background: "#3b82f6",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          STEP {currentStepIdx + 1} OF {routeSteps.length}
                        </span>
                        <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: 600 }}>
                          {routeSteps[currentStepIdx].safety_rating}
                        </span>
                      </div>

                      <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#fff" }}>
                        {routeSteps[currentStepIdx].title}
                      </h4>
                      <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5 }}>
                        {routeSteps[currentStepIdx].guidance}
                      </p>

                      <div
                        style={{
                          padding: "8px 12px",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#93c5fd",
                        }}
                      >
                        🧭 <strong>Advisory:</strong> {routeSteps[currentStepIdx].action_prompt}
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div style={{ display: "flex", gap: "10px" }}>
                    {!isTraversing ? (
                      <button
                        onClick={startTraversal}
                        style={{
                          flex: 1,
                          padding: "12px",
                          background: "linear-gradient(135deg, #22c55e, #16a34a)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        ▶️ Start Route Traversal
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={nextTraversalStep}
                          style={{
                            flex: 1,
                            padding: "12px",
                            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "10px",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          Next Checkpoint ⏩
                        </button>
                        <button
                          onClick={() => setIsTraversing(false)}
                          style={{
                            padding: "12px 18px",
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "10px",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          Stop
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
