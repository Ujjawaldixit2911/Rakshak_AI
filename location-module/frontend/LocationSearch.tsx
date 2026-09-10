"use client";

import React, { useState, useEffect, useRef } from "react";
import { geocode } from "./locationApi";
import { GeocodeResponse } from "./types";

export interface LocationSearchProps {
  onSelect?: (result: GeocodeResponse) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onSelect,
  placeholder = "Search location...",
  debounceMs = 400,
}) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GeocodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query || query.trim().length < 2) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await geocode(query.trim());
        setResult(res);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Not found");
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid #475569",
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          outline: "none",
        }}
      />

      {loading && (
        <div style={{ position: "absolute", right: "12px", top: "10px", fontSize: "12px", color: "#38bdf8" }}>
          Searching...
        </div>
      )}

      {result && (
        <div
          onClick={() => onSelect && onSelect(result)}
          style={{
            marginTop: "6px",
            padding: "10px",
            backgroundColor: "#1e293b",
            borderRadius: "8px",
            cursor: "pointer",
            border: "1px solid #38bdf8",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#f8fafc" }}>
            {result.address}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            Lat: {result.latitude.toFixed(4)}, Lon: {result.longitude.toFixed(4)}
          </div>
        </div>
      )}

      {error && !loading && (
        <div style={{ marginTop: "6px", padding: "8px", backgroundColor: "#450a0a", color: "#fca5a5", borderRadius: "8px", fontSize: "12px" }}>
          {error}
        </div>
      )}
    </div>
  );
};
