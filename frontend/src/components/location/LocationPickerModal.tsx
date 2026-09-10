"use client";

import React, { useState } from "react";
import { MapPin, Navigation, X, Check, Globe } from "lucide-react";
import { LocationSearchAutocomplete } from "./LocationSearchAutocomplete";
import { CurrentLocationButton } from "./CurrentLocationButton";
import { LocationCoordinatesBadge } from "./LocationCoordinatesBadge";
import { GeocodeResult } from "@/lib/locationService";
import { GeolocationCoordinatesData } from "@/hooks/useGeolocation";

export interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: { address: string; latitude: number; longitude: number }) => void;
  title?: string;
  initialLocation?: { address: string; latitude: number; longitude: number } | null;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = "Select Location",
  initialLocation = null,
}) => {
  const [selected, setSelected] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(initialLocation);

  if (!isOpen) return null;

  const handleAutocompleteSelect = (res: GeocodeResult) => {
    setSelected({
      address: res.address,
      latitude: res.latitude,
      longitude: res.longitude,
    });
  };

  const handleGPSLocationFound = (
    coords: GeolocationCoordinatesData,
    resolvedAddress?: string | null
  ) => {
    setSelected({
      address: resolvedAddress || `GPS (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">
                Search place or use device GPS via Nominatim proxy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Autocomplete Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Search by address or landmark:
            </label>
            <LocationSearchAutocomplete
              onLocationSelect={handleAutocompleteSelect}
              placeholder="e.g. Anand Vihar, Ghaziabad, Rajiv Chowk..."
              debounceMs={400}
            />
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Or use GPS
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Current Location Button */}
          <CurrentLocationButton
            onLocationFound={handleGPSLocationFound}
            showAddress={true}
          />

          {/* Selected Location Summary */}
          {selected && (
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-cyan-200">Selected Location:</div>
                  <p className="text-xs text-slate-200 mt-0.5 line-clamp-2">
                    {selected.address}
                  </p>
                </div>
              </div>
              <LocationCoordinatesBadge
                latitude={selected.latitude}
                longitude={selected.longitude}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950/60 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all shadow-lg shadow-cyan-950/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
