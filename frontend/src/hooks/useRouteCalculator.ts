"use client";

import { useState, useCallback } from "react";
import { calculateRoute, RouteCalculateResponse, LatLngPoint } from "@/lib/routeService";
import { calculateETA, ETACalculateResponse } from "@/lib/etaService";

export interface UseRouteCalculatorReturn {
  route: RouteCalculateResponse | null;
  etaData: ETACalculateResponse | null;
  loading: boolean;
  error: string | null;
  fetchRoute: (source: LatLngPoint, destination: LatLngPoint) => Promise<RouteCalculateResponse | null>;
  recalculateETA: (customDepartureTime?: Date) => Promise<ETACalculateResponse | null>;
  clear: () => void;
}

export function useRouteCalculator(): UseRouteCalculatorReturn {
  const [route, setRoute] = useState<RouteCalculateResponse | null>(null);
  const [etaData, setEtaData] = useState<ETACalculateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(
    async (source: LatLngPoint, destination: LatLngPoint): Promise<RouteCalculateResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const routeRes = await calculateRoute(source, destination);
        setRoute(routeRes);

        // Fetch dedicated ETA formatting from ETA Module API
        try {
          const etaRes = await calculateETA(routeRes.duration);
          setEtaData(etaRes);
        } catch (etaErr) {
          console.warn("ETA calculation fallback to route response:", etaErr);
        }

        return routeRes;
      } catch (err: any) {
        if (err.message === "route_not_found") {
          setError("No drivable route found between these locations.");
        } else {
          setError(err.message || "Failed to calculate route.");
        }
        setRoute(null);
        setEtaData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const recalculateETA = useCallback(
    async (customDepartureTime?: Date): Promise<ETACalculateResponse | null> => {
      if (!route) return null;
      try {
        const etaRes = await calculateETA(route.duration, {
          departureTime: customDepartureTime,
        });
        setEtaData(etaRes);
        return etaRes;
      } catch (err) {
        console.warn("Recalculate ETA error:", err);
        return null;
      }
    },
    [route]
  );

  const clear = useCallback(() => {
    setRoute(null);
    setEtaData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    route,
    etaData,
    loading,
    error,
    fetchRoute,
    recalculateETA,
    clear,
  };
}
