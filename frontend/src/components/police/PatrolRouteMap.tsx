"use client";
import { useEffect, useRef } from "react";

export interface RoutePoint {
  order: number;
  lat: number;
  lng: number;
  location: string;
  crime_count: number;
  risk_level: string;
}

interface Props {
  route?: RoutePoint[];
}

const DEFAULT_PATROL_ROUTE: RoutePoint[] = [
  { order: 1, lat: 28.6139, lng: 77.2090, location: "Connaught Place Sector A", crime_count: 12, risk_level: "High" },
  { order: 2, lat: 28.6506, lng: 77.2334, location: "Chandni Chowk Corridor", crime_count: 8, risk_level: "Medium" },
  { order: 3, lat: 28.5355, lng: 77.2500, location: "Nehru Place Hub", crime_count: 4, risk_level: "Low" },
  { order: 4, lat: 28.5672, lng: 77.2100, location: "AIIMS Safe Zone", crime_count: 2, risk_level: "Low" },
  { order: 5, lat: 28.6289, lng: 77.2065, location: "Pahar Ganj High-Risk Corridor", crime_count: 18, risk_level: "Critical" },
];

const RISK_COLORS: Record<string, string> = {
  Critical: "#ff3b30",
  High: "#ff9500",
  Medium: "#ffcc00",
  Low: "#34c759",
};

export default function PatrolRouteMap({ route = DEFAULT_PATROL_ROUTE }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const activeRoute = route && route.length > 0 ? route : DEFAULT_PATROL_ROUTE;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !activeRoute?.length) return;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = [activeRoute[0].lat, activeRoute[0].lng];
      const map = L.map(mapRef.current!, { zoomControl: true });
      mapInstanceRef.current = map;
      map.setView(center, 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        opacity: 0.5,
      }).addTo(map);

      // Route polyline
      const latlngs: [number, number][] = activeRoute.map(p => [p.lat, p.lng]);
      latlngs.push(latlngs[0]); // close loop

      L.polyline(latlngs, {
        color: "#0071e3",
        weight: 3.5,
        opacity: 0.85,
        dashArray: "8 6",
      }).addTo(map);

      // Animated dot line
      L.polyline(latlngs, {
        color: "#5e5ce6",
        weight: 2,
        opacity: 0.4,
      }).addTo(map);

      // Markers
      activeRoute.forEach((p, i) => {
        const color = RISK_COLORS[p.risk_level] || "#6b7280";
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:32px;height:32px;border-radius:50%;
            background:${color}22;border:2px solid ${color};
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:800;color:${color};
            box-shadow:0 0 12px ${color}55;
          ">${i + 1}</div>`,
          iconSize: [32, 32],
        });
        L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;padding:4px;color:#0a0a0a">
              <strong>Stop ${i + 1}: ${p.location}</strong><br/>
              <span style="color:${color};font-weight:700;font-size:0.82rem">${p.risk_level} Risk</span><br/>
              <span style="color:#64748b;font-size:0.78rem">${p.crime_count} incidents logged</span>
            </div>
          `);
      });

      // Fit bounds
      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeRoute]);

  return (
    <div ref={mapRef} className="h-[460px] w-full rounded-2xl overflow-hidden border border-white/[0.08]" />
  );
}
