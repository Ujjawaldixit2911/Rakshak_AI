"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { geocodeLocation, GeocodeResult } from "@/lib/locationService";

export interface UseLocationSearchOptions {
  debounceMs?: number; // default 400ms (within 300-500ms requirement)
  minQueryLength?: number;
  initialQuery?: string;
}

export interface UseLocationSearchResult {
  query: string;
  setQuery: (query: string) => void;
  result: GeocodeResult | null;
  loading: boolean;
  error: string | null;
  searchImmediate: (overrideQuery?: string) => Promise<GeocodeResult | null>;
  clear: () => void;
}

export function useLocationSearch(options: UseLocationSearchOptions = {}): UseLocationSearchResult {
  const { debounceMs = 400, minQueryLength = 2, initialQuery = "" } = options;

  const [query, setQuery] = useState<string>(initialQuery);
  const [result, setResult] = useState<GeocodeResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeGeocode = useCallback(
    async (searchQuery: string): Promise<GeocodeResult | null> => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < minQueryLength) {
        setResult(null);
        setError(null);
        setLoading(false);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await geocodeLocation(trimmed);
        setResult(data);
        setError(null);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to geocode location.");
        setResult(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [minQueryLength]
  );

  // Debounce effect on query change
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query || query.trim().length < minQueryLength) {
      setLoading(false);
      setError(null);
      setResult(null);
      return;
    }

    setLoading(true); // show immediate typing indicator
    timeoutRef.current = setTimeout(() => {
      executeGeocode(query);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceMs, minQueryLength, executeGeocode]);

  const searchImmediate = useCallback(
    async (overrideQuery?: string): Promise<GeocodeResult | null> => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      const q = overrideQuery !== undefined ? overrideQuery : query;
      return executeGeocode(q);
    },
    [query, executeGeocode]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setQuery("");
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    query,
    setQuery,
    result,
    loading,
    error,
    searchImmediate,
    clear,
  };
}
