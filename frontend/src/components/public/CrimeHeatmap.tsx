"use client";
import { useEffect, useRef } from "react";
import type { HeatmapPoint, Hotspot } from "@/lib/api";

interface Props {
  center: [number, number];
  heatmap: HeatmapPoint[];
  hotspots: Hotspot[];
  zoom?: number;
}

export default function CrimeHeatmap({ center, heatmap, hotspots, zoom = 13 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import for SSR safety
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;
      map.setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        opacity: 0.5,
      }).addTo(map);

      // Heatmap layer (leaflet.heat)
      if (heatmap.length > 0) {
        try {
          // @ts-ignore
          const heat = await import("leaflet.heat");
          const points = heatmap.map(p => [p.lat, p.lng, p.intensity]);
          // @ts-ignore
          const heatLayer = (L as any).heatLayer(points, {
            radius: 22, blur: 18, maxZoom: 14,
            gradient: { 0.2: "#22c55e", 0.5: "#f59e0b", 0.75: "#f97316", 1.0: "#ef4444" },
          }).addTo(map);
          heatLayerRef.current = heatLayer;
        } catch (e) {
          console.warn("leaflet.heat not loaded:", e);
        }
      }

      // Hotspot markers
      const RISK_COLORS: Record<string, string> = {
        Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#22c55e",
      };
      hotspots.forEach(h => {
        const color = RISK_COLORS[h.risk_level] || "#6b7280";
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${color}22;border:2.5px solid ${color};
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;color:${color};
            box-shadow:0 0 10px ${color}66;
          ">${h.crime_count}</div>`,
          iconSize: [28, 28],
        });
        L.marker([h.lat, h.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;padding:4px">
              <strong style="color:${color}">${h.risk_level} Risk</strong><br/>
              <span style="font-size:0.85rem">${h.location}</span><br/>
              <span style="font-size:0.82rem;color:#8899bb">${h.crime_count} crimes · Intensity ${Math.round(h.intensity * 100)}%</span>
            </div>
          `);
      });
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  // Update center when it changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mapRef} style={{ height: 380, width: "100%", borderRadius: 12, overflow: "hidden" }} />
      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 16, right: 16, zIndex: 1000,
        background: "rgba(7,13,26,0.9)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10, padding: "10px 14px",
      }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#4a5f82", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Risk Level</div>
        {[["Critical", "#ef4444"], ["High", "#f97316"], ["Medium", "#f59e0b"], ["Low", "#22c55e"]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: "0.78rem", color: "#8899bb" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
