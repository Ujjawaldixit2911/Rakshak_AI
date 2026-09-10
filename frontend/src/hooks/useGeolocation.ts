"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { reverseGeocodeLocation } from "@/lib/locationService";

export interface GeolocationCoordinatesData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoReverseGeocode?: boolean;
}

export interface UseGeolocationReturn {
  coordinates: GeolocationCoordinatesData | null;
  address: string | null;
  loading: boolean;
  reverseGeocoding: boolean;
  error: string | null;
  isWatching: boolean;
  permissionStatus: "prompt" | "granted" | "denied" | "unsupported";
  getCurrentPosition: (options?: UseGeolocationOptions) => Promise<GeolocationCoordinatesData | null>;
  startWatching: (options?: UseGeolocationOptions) => void;
  stopWatching: () => void;
  refreshAddress: () => Promise<string | null>;
  clear: () => void;
}

export function useGeolocation(initialOptions: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [coordinates, setCoordinates] = useState<GeolocationCoordinatesData | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [reverseGeocoding, setReverseGeocoding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<"prompt" | "granted" | "denied" | "unsupported">("prompt");

  const watchIdRef = useRef<number | null>(null);

  // Check initial permission status if supported
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setPermissionStatus("unsupported");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((permission) => {
          setPermissionStatus(permission.state as "prompt" | "granted" | "denied");
          permission.onchange = () => {
            setPermissionStatus(permission.state as "prompt" | "granted" | "denied");
          };
        })
        .catch(() => {
          // Permissions API might not support geolocation in some environments
        });
    }
  }, []);

  // Internal reverse geocoder helper
  const performReverseGeocode = useCallback(async (lat: number, lon: number): Promise<string | null> => {
    setReverseGeocoding(true);
    try {
      const res = await reverseGeocodeLocation(lat, lon);
      setAddress(res.address);
      return res.address;
    } catch (err: any) {
      console.warn("Reverse geocode failed:", err.message);
      return null;
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  // Format browser GeolocationPosition
  const handleSuccess = useCallback(
    async (pos: GeolocationPosition, shouldReverseGeocode: boolean = true): Promise<GeolocationCoordinatesData> => {
      const coordsData: GeolocationCoordinatesData = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      };

      setCoordinates(coordsData);
      setError(null);
      setLoading(false);

      if (shouldReverseGeocode) {
        await performReverseGeocode(coordsData.latitude, coordsData.longitude);
      }

      return coordsData;
    },
    [performReverseGeocode]
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    setLoading(false);
    let msg = "Unable to retrieve device location.";
    switch (err.code) {
      case err.PERMISSION_DENIED:
        msg = "Location permission denied. Please enable location services in your browser settings.";
        setPermissionStatus("denied");
        break;
      case err.POSITION_UNAVAILABLE:
        msg = "Location information is currently unavailable from GPS hardware.";
        break;
      case err.TIMEOUT:
        msg = "Location request timed out. Please retry.";
        break;
      default:
        msg = err.message || msg;
    }
    setError(msg);
  }, []);

  // Get current one-off position
  const getCurrentPosition = useCallback(
    async (opts?: UseGeolocationOptions): Promise<GeolocationCoordinatesData | null> => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        return null;
      }

      const options: PositionOptions = {
        enableHighAccuracy: opts?.enableHighAccuracy ?? initialOptions.enableHighAccuracy ?? true,
        timeout: opts?.timeout ?? initialOptions.timeout ?? 10000,
        maximumAge: opts?.maximumAge ?? initialOptions.maximumAge ?? 0,
      };

      const shouldReverse = opts?.autoReverseGeocode ?? initialOptions.autoReverseGeocode ?? true;

      setLoading(true);
      setError(null);

      return new Promise<GeolocationCoordinatesData | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const data = await handleSuccess(pos, shouldReverse);
            resolve(data);
          },
          (err) => {
            handleError(err);
            resolve(null);
          },
          options
        );
      });
    },
    [handleSuccess, handleError, initialOptions]
  );

  // Start continuous position tracking
  const startWatching = useCallback(
    (opts?: UseGeolocationOptions) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        return;
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      const options: PositionOptions = {
        enableHighAccuracy: opts?.enableHighAccuracy ?? initialOptions.enableHighAccuracy ?? true,
        timeout: opts?.timeout ?? initialOptions.timeout ?? 10000,
        maximumAge: opts?.maximumAge ?? initialOptions.maximumAge ?? 1000,
      };

      const shouldReverse = opts?.autoReverseGeocode ?? initialOptions.autoReverseGeocode ?? true;

      setIsWatching(true);
      setError(null);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          handleSuccess(pos, shouldReverse);
        },
        (err) => {
          handleError(err);
        },
        options
      );
    },
    [handleSuccess, handleError, initialOptions]
  );

  // Stop tracking
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Explicit manual reverse geocoding refresh
  const refreshAddress = useCallback(async (): Promise<string | null> => {
    if (!coordinates) return null;
    return performReverseGeocode(coordinates.latitude, coordinates.longitude);
  }, [coordinates, performReverseGeocode]);

  const clear = useCallback(() => {
    stopWatching();
    setCoordinates(null);
    setAddress(null);
    setError(null);
    setLoading(false);
  }, [stopWatching]);

  return {
    coordinates,
    address,
    loading,
    reverseGeocoding,
    error,
    isWatching,
    permissionStatus,
    getCurrentPosition,
    startWatching,
    stopWatching,
    refreshAddress,
    clear,
  };
}
