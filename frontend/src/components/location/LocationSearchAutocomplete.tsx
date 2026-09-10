"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, MapPin, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { GeocodeResult } from "@/lib/locationService";

export interface LocationSearchAutocompleteProps {
  placeholder?: string;
  onLocationSelect?: (location: GeocodeResult) => void;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

export const LocationSearchAutocomplete: React.FC<LocationSearchAutocompleteProps> = ({
  placeholder = "Search area, landmark or street (e.g., Ghaziabad, Connaught Place)...",
  onLocationSelect,
  debounceMs = 400,
  className = "",
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { query, setQuery, result, loading, error, searchImmediate, clear } =
    useLocationSearch({ debounceMs, minQueryLength: 2 });

  // Open dropdown when query has length or result is available
  useEffect(() => {
    if (query.trim().length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  // Click outside listener to dismiss suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (selected: GeocodeResult) => {
    setQuery(selected.address);
    setIsOpen(false);
    if (onLocationSelect) {
      onLocationSelect(selected);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (result) {
        handleSelect(result);
      } else {
        searchImmediate();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center w-full bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/50 focus-within:border-cyan-500 rounded-xl transition-all duration-200 shadow-lg shadow-black/40 backdrop-blur-md">
        <div className="pl-4 pr-2 text-cyan-400">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          ) : (
            <Search className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full py-3.5 pr-10 text-sm text-slate-100 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {loading && !result && (
            <div className="flex items-center gap-3 px-4 py-4 text-xs font-mono text-cyan-300/80">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Resolving coordinates via Nominatim proxy...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3 px-4 py-3.5 text-xs text-rose-300 bg-rose-950/30 border-b border-rose-900/30">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Location not found</p>
                <p className="text-rose-300/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="p-2">
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left p-3 rounded-lg hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 transition-all duration-150 group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {result.address}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700">
                      Lat: {result.latitude.toFixed(4)}°
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700">
                      Lon: {result.longitude.toFixed(4)}°
                    </span>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 mt-1" />
              </button>
            </div>
          )}

          {/* Rate-limit compliance note */}
          <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Nominatim Cached Proxy Engine</span>
            <span className="text-cyan-400">Rakshak AI Location</span>
          </div>
        </div>
      )}
    </div>
  );
};
