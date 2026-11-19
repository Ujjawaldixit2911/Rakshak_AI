"use client";

import { useState, useMemo } from "react";
import { INDIAN_CITIES, CityMetadata } from "@/lib/cities";
import {
  MapPin,
  Search,
  Check,
  Shield,
  Activity,
  Radio,
  X,
  Compass,
  Car,
  Camera,
} from "lucide-react";

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
  title = "Select Operating Jurisdiction & City",
  subtitle = "Choose from 10 major metropolitan surveillance commands & AI safety grids across India.",
}: CityPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("All");

  const zones = ["All", "North", "South", "West", "East"];

  const filteredCities = useMemo(() => {
    return INDIAN_CITIES.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.emergencyCommand.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesZone = selectedZone === "All" || c.zone === selectedZone;

      return matchesSearch && matchesZone;
    });
  }, [searchQuery, selectedZone]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4 bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--accent-subtle)] border border-[rgba(5,150,105,0.3)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[var(--accent-primary)] flex items-center gap-1.5">
                <span>ERSS-112 City Network</span>
                <span>•</span>
                <span>10 Metro Jurisdictions</span>
              </div>
              <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                {title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, state (e.g. Mumbai, Karnataka, Jaipur)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Zone Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] w-full sm:w-auto overflow-x-auto">
              {zones.map((z) => (
                <button
                  key={z}
                  onClick={() => setSelectedZone(z)}
                  className={`
                    px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap
                    ${
                      selectedZone === z
                        ? "bg-[var(--accent-primary)] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }
                  `}
                >
                  {z === "All" ? "All Zones" : `${z} Zone`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* City Cards Grid */}
        <div className="p-6 overflow-y-auto max-h-[58vh] space-y-3">
          {filteredCities.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-bold text-[var(--text-primary)]">No matching city found</p>
              <p className="text-sm">Try searching for Delhi, Mumbai, Bengaluru, Chennai, etc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCities.map((c) => {
                const isSelected =
                  selectedCity.toLowerCase() === c.shortName.toLowerCase() ||
                  selectedCity.toLowerCase() === c.name.toLowerCase() ||
                  selectedCity.toLowerCase() === c.id.toLowerCase();

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCity(c.shortName);
                      onClose();
                    }}
                    className={`
                      relative p-4.5 rounded-2xl border transition-all cursor-pointer text-left
                      ${
                        isSelected
                          ? "bg-[var(--accent-subtle)] border-[var(--accent-primary)] shadow-md ring-1 ring-[var(--accent-primary)]"
                          : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:shadow-sm"
                      }
                    `}
                  >
                    {/* Top Row: Name, Zone, & Selection Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isSelected
                              ? "bg-[var(--accent-primary)] text-white"
                              : "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                          }`}
                        >
                          <MapPin className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[15px] text-[var(--text-primary)]">
                              {c.name}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                              {c.zone}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--text-secondary)] font-medium">
                            {c.state} • {c.jurisdictionBadge}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-primary)] text-white text-[11px] font-bold shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Active
                        </span>
                      )}
                    </div>

                    {/* Emergency Command Label */}
                    <div className="text-[11.5px] font-semibold text-[var(--text-muted)] truncate mb-3 pl-1">
                      🏛️ {c.emergencyCommand}
                    </div>

                    {/* Stats Metric Strip */}
                    <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-[var(--border-subtle)]">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                          Safety
                        </div>
                        <div className="text-xs font-black text-[#10b981]">
                          {c.safetyScore}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                          Patrol
                        </div>
                        <div className="text-xs font-black text-[var(--text-primary)]">
                          {c.activePatrolUnits} Units
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                          CCTV
                        </div>
                        <div className="text-xs font-black text-[var(--text-primary)]">
                          {c.activeCameras.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                          Dispatch
                        </div>
                        <div className="text-xs font-black text-[var(--accent-primary)]">
                          {c.responseMins}m
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between gap-4">
          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>Real-time ERSS-112 multi-jurisdiction telemetry operational</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
