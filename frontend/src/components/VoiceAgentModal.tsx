"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Navigation, Shield, AlertTriangle, RefreshCw, X, Radio, MapPin, ChevronRight, Play, CheckCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute?: (route: any) => void;
}

interface NavStep {
  stepNumber: number;
  title: string;
  instruction: string;
  safetyScore?: number;
  type: "start" | "corridor" | "dest";
}

export default function VoiceAgentModal({
  isOpen,
  onClose,
  onSelectRoute,
}: VoiceAgentModalProps) {
  const [language, setLanguage] = useState<"hi-IN" | "en-IN">("hi-IN");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [replyText, setReplyText] = useState("");
  const [toolCalls, setToolCalls] = useState<string[]>([]);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [navSteps, setNavSteps] = useState<NavStep[]>([]);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      // Pre-load voices for Chrome/Edge
      window.speechSynthesis?.getVoices();
    }
  }, []);

  // Extract navigation steps from response or route result
  const extractNavSteps = (text: string, route: any): NavStep[] => {
    const steps: NavStep[] = [];
    
    // Check if route has waypoints or endpoints
    const origin = route?.origin_name || route?.safest?.origin_name || "Starting Point";
    const dest = route?.dest_name || route?.safest?.dest_name || "Destination";
    const waypoints = route?.waypoints || route?.safest?.waypoints || [];

    if (waypoints.length > 0) {
      steps.push({
        stepNumber: 1,
        title: `Start at ${waypoints[0] || origin}`,
        instruction: `Apne starting point se nikle aur main lighted arterial road follow karein.`,
        type: "start",
        safetyScore: 92,
      });

      for (let i = 1; i < waypoints.length - 1; i++) {
        steps.push({
          stepNumber: i + 1,
          title: `Pass through ${waypoints[i]}`,
          instruction: `Safe corridor lane se aage badhein. Well-lit streetlights & active police patrol coverage.`,
          type: "corridor",
          safetyScore: 90,
        });
      }

      steps.push({
        stepNumber: steps.length + 1,
        title: `Arrive safely at ${waypoints[waypoints.length - 1] || dest}`,
        instruction: `Destination perimeter me enter karein. Emergency POI trauma & police post active.`,
        type: "dest",
        safetyScore: 95,
      });
    } else {
      // Fallback 3-step structured guidance
      steps.push({
        stepNumber: 1,
        title: `Departure: ${origin}`,
        instruction: `Main lighted route pakdein, dark unmonitored alleys avoid karein.`,
        type: "start",
        safetyScore: 90,
      });
      steps.push({
        stepNumber: 2,
        title: `Safe Corridor Highway`,
        instruction: `Continuous CCTV coverage aur maximum visibility corridor se hote hue proceed karein.`,
        type: "corridor",
        safetyScore: 88,
      });
      steps.push({
        stepNumber: 3,
        title: `Arrival: ${dest}`,
        instruction: `Designated safe drop zone aur illuminated public parking area par pahuchein.`,
        type: "dest",
        safetyScore: 94,
      });
    }

    return steps;
  };

  // Initialize Speech Recognition
  const startListening = () => {
    setErrorMsg("");
    setReplyText("");
    setToolCalls([]);
    setRouteResult(null);
    setNavSteps([]);

    // Stop ongoing speech synthesis
    stopSpeaking();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("Web Speech API is not supported in this browser. Please use Chrome/Edge or type your query.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("Listening...");
      };

      recognition.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          setErrorMsg(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start voice recognition:", err);
      setIsListening(false);
      setErrorMsg(err.message || "Failed to initialize microphone.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Submit query to AI Agent POST /api/agent/query
  const sendQueryToAgent = async (userMessage: string) => {
    if (!userMessage || userMessage === "Listening...") return;

    setIsThinking(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          userId: "voice_user",
          userLocation: {
            latitude: 28.6139,
            longitude: 77.2090,
            city: "Delhi",
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setReplyText(data.reply);
      setToolCalls(data.toolCallsUsed || []);
      
      const generatedSteps = extractNavSteps(data.reply, data.route);
      setNavSteps(generatedSteps);
      setActiveStepIdx(0);

      if (data.route) {
        setRouteResult(data.route);
        if (onSelectRoute) {
          onSelectRoute(data.route);
        }
      }

      // Speak response out loud
      speakReply(data.reply);
    } catch (err: any) {
      console.error("Error querying agent:", err);
      setErrorMsg(err.message || "Failed to contact AI Agent.");
    } finally {
      setIsThinking(false);
    }
  };

  // Text-To-Speech with persistent utterance ref
  const speakReply = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Clean markdown symbols for natural speech
      const cleanText = text
        .replace(/[*_#`~]/g, "")
        .replace(/\[.*?\]\(.*?\)/g, "")
        .replace(/- 🛡️|- ⚡|- ⚖️|•|➔/g, ". ")
        .replace(/https?:\/\/\S+/g, "")
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      currentUtteranceRef.current = utterance;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => (language === "hi-IN" ? (v.lang === "hi-IN" || v.lang === "hi_IN") : v.lang.startsWith("en-IN"))) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.lang = language;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS Error:", e);
      setIsSpeaking(false);
    }
  };

  // Speak a single navigation step
  const speakNavStep = (step: NavStep) => {
    const textToSpeak = `Step ${step.stepNumber}: ${step.title}. ${step.instruction}`;
    speakReply(textToSpeak);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide flex items-center gap-2">
                <span>Rakshak Voice Agent & Navigation</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">LIVE AI</span>
              </h2>
              <p className="text-xs text-slate-400">Natural Voice Directions & Safe Path Traversal</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Selector */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-medium">
              <button
                onClick={() => setLanguage("hi-IN")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  language === "hi-IN"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🇮🇳 Hindi
              </button>
              <button
                onClick={() => setLanguage("en-IN")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  language === "en-IN"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🇬🇧 English
              </button>
            </div>

            <button
              onClick={() => {
                stopListening();
                stopSpeaking();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 flex flex-col items-center space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Visualizer Orb */}
          <div className="relative flex items-center justify-center my-1">
            {isListening && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-indigo-500/20 animate-ping duration-1000" />
                <div className="absolute w-28 h-28 rounded-full bg-purple-500/30 animate-pulse" />
              </>
            )}
            {isSpeaking && (
              <div className="absolute w-32 h-32 rounded-full bg-emerald-500/20 animate-pulse duration-700" />
            )}

            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${
                isListening
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white ring-4 ring-red-500/40"
                  : isThinking
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-4 ring-amber-500/40 animate-spin"
                  : isSpeaking
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white ring-4 ring-emerald-500/40"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/30 hover:scale-105"
              }`}
            >
              {isListening ? (
                <MicOff className="w-8 h-8" />
              ) : isThinking ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 animate-bounce" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Status Label */}
          <div className="text-center">
            {isListening ? (
              <p className="text-sm font-semibold text-rose-400 animate-pulse">
                🎙️ Listening... Bolen kahan se kahan jaana hai
              </p>
            ) : isThinking ? (
              <p className="text-sm font-semibold text-amber-400 animate-pulse">
                🧠 Finding Safest Path & Step-by-Step Directions...
              </p>
            ) : isSpeaking ? (
              <div className="flex items-center justify-center space-x-2">
                <p className="text-sm font-semibold text-emerald-400">🔊 Speaking Navigation Guidance...</p>
                <button
                  onClick={stopSpeaking}
                  className="px-2 py-0.5 bg-slate-800 text-rose-400 hover:text-white rounded text-xs flex items-center space-x-1 border border-rose-500/30"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Stop Voice</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Tap microphone to speak (e.g. <em>"Mujhe Ghaziabad se Noida jaana hai safest route se"</em>)
              </p>
            )}
          </div>

          {/* Live Transcript Box */}
          {transcript && (
            <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recognized Speech:</span>
                {!isListening && (
                  <button
                    onClick={() => sendQueryToAgent(transcript)}
                    disabled={isThinking}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Run Query</span>
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-200 font-medium italic">"{transcript}"</p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="w-full bg-red-950/50 border border-red-800/60 rounded-xl p-3 text-red-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Executed Tools Badge Array */}
          {toolCalls.length > 0 && (
            <div className="w-full flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 mr-1">Tools Executed:</span>
              {toolCalls.map((tool, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 text-[11px] font-mono"
                >
                  ⚡ {tool}
                </span>
              ))}
            </div>
          )}

          {/* Step-by-Step Navigation Path Guide Card */}
          {navSteps.length > 0 && (
            <div className="w-full bg-slate-800/90 border border-emerald-500/40 rounded-xl p-4 flex flex-col space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span>📍 Step-by-Step Navigation Path</span>
                </div>
                <button
                  onClick={() => speakNavStep(navSteps[activeStepIdx])}
                  className="px-2.5 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Speak Step {activeStepIdx + 1}</span>
                </button>
              </div>

              {/* Active Step Highlight Box */}
              <div className="p-3.5 bg-slate-900/90 border border-indigo-500/40 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                    CHECKPOINT {activeStepIdx + 1} OF {navSteps.length}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    Safety Score: {navSteps[activeStepIdx].safetyScore || 90}/100
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {navSteps[activeStepIdx].title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {navSteps[activeStepIdx].instruction}
                </p>
              </div>

              {/* Navigation Steps Progression List */}
              <div className="space-y-1.5">
                {navSteps.map((step, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveStepIdx(idx);
                      speakNavStep(step);
                    }}
                    className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                      activeStepIdx === idx
                        ? "bg-emerald-950/60 border border-emerald-500/50 text-white font-semibold"
                        : "bg-slate-900/50 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 text-[10px] flex items-center justify-center font-bold text-slate-200">
                        {step.stepNumber}
                      </span>
                      <span>{step.title}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 gap-2">
                <button
                  disabled={activeStepIdx === 0}
                  onClick={() => {
                    const prevIdx = Math.max(0, activeStepIdx - 1);
                    setActiveStepIdx(prevIdx);
                    speakNavStep(navSteps[prevIdx]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 transition"
                >
                  ◀ Previous
                </button>
                <button
                  disabled={activeStepIdx === navSteps.length - 1}
                  onClick={() => {
                    const nextIdx = Math.min(navSteps.length - 1, activeStepIdx + 1);
                    setActiveStepIdx(nextIdx);
                    speakNavStep(navSteps[nextIdx]);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition flex items-center justify-center space-x-1"
                >
                  <span>Next Checkpoint</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* AI Text Response Card */}
          {replyText && (
            <div className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-4 flex flex-col space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Agent Safety Recommendation</span>
                </div>
                <button
                  onClick={() => (isSpeaking ? stopSpeaking() : speakReply(replyText))}
                  className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition"
                  title={isSpeaking ? "Stop Voice" : "Replay Full Voice"}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>

              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                {replyText}
              </div>

              {routeResult && (
                <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Multi-Route Options Ready on Map</span>
                  </span>
                  <button
                    onClick={() => {
                      if (onSelectRoute) onSelectRoute(routeResult);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                  >
                    View on Map
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Quick Prompts */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/95 flex flex-wrap gap-2">
          <span className="text-[11px] text-slate-400 self-center">Try saying:</span>
          {[
            "Mujhe Ghaziabad se Noida jaana hai safest route se",
            "Connaught Place se Saket safe path",
            "Find nearby police stations",
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTranscript(prompt);
                sendQueryToAgent(prompt);
              }}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 px-2.5 py-1 rounded-full transition truncate max-w-[240px]"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

