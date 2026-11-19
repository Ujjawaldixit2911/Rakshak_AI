"use client";

import { useState, useMemo } from "react";
import { INDIAN_CITIES } from "@/lib/cities";
import { MapPin, Search, Check, X } from "lucide-react";

interface CityPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (cityShortName: string) => void;
  title?: string;
  subtitle?: string;
}

export default function CityPickerModal({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
  title = "Select City",
  subtitle = "Choose your city or jurisdiction to view local safety routes & data.",
}: CityPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCities = useMemo(() => {
    return INDIAN_CITIES.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--bg-card)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-subtle)] border border-[rgba(5,150,105,0.25)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                {title}
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] font-medium">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city (e.g. Mumbai, Jaipur, Pune)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Clean, Simple City List (No Clutter) */}
        <div className="p-3 overflow-y-auto max-h-[60vh] space-y-1.5">
          {filteredCities.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--text-muted)]">
              No matching city found.
            </div>
          ) : (
            filteredCities.map((c) => {
              const isSelected =
                selectedCity.toLowerCase() === c.shortName.toLowerCase() ||
                selectedCity.toLowerCase() === c.name.toLowerCase() ||
                selectedCity.toLowerCase() === c.id.toLowerCase();

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectCity(c.shortName);
                    onClose();
                  }}
                  className={`
                    w-full px-4 py-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer text-left
                    ${
                      isSelected
                        ? "bg-[var(--accent-subtle)] border-[var(--accent-primary)] text-[var(--text-primary)] shadow-sm font-bold"
                        : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">📍</span>
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        {c.name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] font-normal">
                        {c.state} • {c.zone} Zone
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-[var(--accent-primary)]">
                      <Check className="w-4 h-4 stroke-[3]" />
                      Selected
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)] opacity-50">
                      Select →
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>{INDIAN_CITIES.length} cities available</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
