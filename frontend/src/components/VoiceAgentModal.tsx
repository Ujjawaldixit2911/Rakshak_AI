"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Navigation, Shield, AlertTriangle, RefreshCw, X, Radio } from "lucide-react";

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute?: (route: any) => void;
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
  const [errorMsg, setErrorMsg] = useState("");

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Initialize Speech Recognition
  const startListening = () => {
    setErrorMsg("");
    setReplyText("");
    setToolCalls([]);
    setRouteResult(null);

    // Stop ongoing speech synthesis
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

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
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${backendUrl}/api/agent/query`, {
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
      if (data.route) {
        setRouteResult(data.route);
        if (onSelectRoute) {
          onSelectRoute(data.route);
        }
      }

      // Speak response
      speakReply(data.reply);
    } catch (err: any) {
      console.error("Error querying agent:", err);
      setErrorMsg(err.message || "Failed to contact AI Agent.");
    } finally {
      setIsThinking(false);
    }
  };

  // Text-To-Speech
  const speakReply = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    // Clean markdown symbols for cleaner audio narration
    const cleanText = text
      .replace(/[*_#`~]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .replace(/- 🛡️|- ⚡|- ⚖️/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide">Rakshak Voice Agent</h2>
              <p className="text-xs text-slate-400">Natural Voice & Tool-Calling Safety AI</p>
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
                🇮🇳 Hindi / Hinglish
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
        <div className="p-6 flex flex-col items-center space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Visualizer Orb */}
          <div className="relative flex items-center justify-center my-2">
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
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${
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
                <MicOff className="w-10 h-10" />
              ) : isThinking ? (
                <RefreshCw className="w-10 h-10 animate-spin" />
              ) : isSpeaking ? (
                <Volume2 className="w-10 h-10 animate-bounce" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          {/* Status Label */}
          <div className="text-center">
            {isListening ? (
              <p className="text-sm font-semibold text-rose-400 animate-pulse">
                Listening... Speak your destination or question
              </p>
            ) : isThinking ? (
              <p className="text-sm font-semibold text-amber-400 animate-pulse">
                AI Agent orchestrating tools...
              </p>
            ) : isSpeaking ? (
              <div className="flex items-center justify-center space-x-2">
                <p className="text-sm font-semibold text-emerald-400">Speaking response...</p>
                <button
                  onClick={stopSpeaking}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs flex items-center space-x-1"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Tap microphone to speak (e.g. "Mujhe Ghaziabad se Noida jaana hai safest route se")
              </p>
            )}
          </div>

          {/* Live Transcript Box */}
          {transcript && (
            <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recognized Speech</span>
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
              <span className="text-xs text-slate-400 mr-1">Tools Executed:</span>
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

          {/* AI Response Card */}
          {replyText && (
            <div className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-4 flex flex-col space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Agent Safety Recommendation</span>
                </div>
                {synthRef.current && (
                  <button
                    onClick={() => (isSpeaking ? stopSpeaking() : speakReply(replyText))}
                    className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition"
                    title={isSpeaking ? "Stop Voice" : "Replay Voice"}
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                )}
              </div>

              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
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
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex flex-wrap gap-2">
          <span className="text-[11px] text-slate-400 self-center">Try saying:</span>
          {[
            "Mujhe Ghaziabad se Noida jaana hai safest route se",
            "Find nearby police stations",
            "Is Sector 18 Noida safe right now?",
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
