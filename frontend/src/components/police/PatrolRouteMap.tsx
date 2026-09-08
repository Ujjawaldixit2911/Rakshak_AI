"use client";
import { useEffect, useRef } from "react";

interface RoutePoint {
  order: number;
  lat: number;
  lng: number;
  location: string;
  crime_count: number;
  risk_level: string;
}

interface Props { route: RoutePoint[]; }

const RISK_COLORS: Record<string, string> = {
  Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#22c55e",
};

export default function PatrolRouteMap({ route }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !route?.length) return;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = [route[0].lat, route[0].lng];
      const map = L.map(mapRef.current!, { zoomControl: true });
      mapInstanceRef.current = map;
      map.setView(center, 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", opacity: 0.5,
      }).addTo(map);

      // Route polyline
      const latlngs: [number, number][] = route.map(p => [p.lat, p.lng]);
      latlngs.push(latlngs[0]); // close loop

      L.polyline(latlngs, {
        color: "#4f7cff", weight: 3, opacity: 0.85, dashArray: "8 6",
      }).addTo(map);

      // Animated dot
      const animLine = L.polyline(latlngs, {
        color: "#818cf8", weight: 2, opacity: 0.4,
      }).addTo(map);

      // Markers
      route.forEach((p, i) => {
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
            <div style="font-family:Inter,sans-serif;padding:4px">
              <strong>Stop ${i + 1}: ${p.location}</strong><br/>
              <span style="color:${color};font-size:0.82rem">${p.risk_level} Risk</span><br/>
              <span style="color:#8899bb;font-size:0.78rem">${p.crime_count} crimes</span>
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
  }, [route]);

  return (
    <div ref={mapRef} style={{ height: 460, width: "100%", borderRadius: 14, overflow: "hidden" }} />
  );
}
