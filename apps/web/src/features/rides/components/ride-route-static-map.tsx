"use client";

import { useEffect, useMemo, useState } from "react";

import type { RideRouteCoordinate } from "@/features/rides/lib/ride-share-export";
import { buildStaticMapUrl } from "@/features/rides/lib/ride-share-static-map";

interface RideRouteStaticMapProps {
  coordinates: RideRouteCoordinate[];
}

export function RideRouteStaticMap({ coordinates }: RideRouteStaticMapProps) {
  const staticMapUrl = useMemo(() => buildStaticMapUrl(coordinates), [coordinates]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hasMapError, setHasMapError] = useState(false);
  const path = coordinates.length >= 2 ? buildSvgPath(coordinates) : null;
  const start = coordinates.length >= 2 ? projectCoordinates(coordinates)[0] : null;
  const end = coordinates.length >= 2 ? projectCoordinates(coordinates)[coordinates.length - 1] : null;

  useEffect(() => {
    setIsMapLoaded(false);
    setHasMapError(false);
  }, [staticMapUrl]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (coordinates.length < 2 || staticMapUrl || process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return;

    console.warn("Static map disabled: missing NEXT_PUBLIC_MAPBOX_TOKEN");
  }, [coordinates.length, staticMapUrl]);

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-teal-300/25 bg-slate-950 shadow-[0_24px_80px_rgba(20,184,166,0.18)]">
      <AbstractRouteMap path={path} start={start} end={end} />

      {path && staticMapUrl && !hasMapError ? (
        <img
          key={staticMapUrl}
          src={staticMapUrl}
          alt="Mapa estático de la traza GPS de la rodada"
          crossOrigin="anonymous"
          className={`absolute inset-0 h-full min-h-[250px] w-full object-cover transition-opacity duration-300 ${isMapLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setIsMapLoaded(true)}
          onError={() => setHasMapError(true)}
        />
      ) : null}
    </div>
  );
}

function AbstractRouteMap({
  path,
  start,
  end
}: {
  path: string | null;
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
}) {
  return (
    <svg viewBox="0 0 800 390" role="img" aria-label={path ? "Traza GPS de la rodada" : "Sin traza GPS disponible"} className="h-full min-h-[250px] w-full">
      <defs>
        <linearGradient id="ride-share-map-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#071a24" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <radialGradient id="ride-share-map-glow" cx="70%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
        <pattern id="ride-share-grid" width="70" height="62" patternUnits="userSpaceOnUse" patternTransform="skewX(-18)">
          <path d="M 70 0 L 0 0 0 62" fill="none" stroke="#2dd4bf" strokeOpacity="0.11" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="800" height="390" fill="url(#ride-share-map-bg)" />
      <rect width="800" height="390" fill="url(#ride-share-map-glow)" />
      <rect width="800" height="390" fill="url(#ride-share-grid)" />

      {path ? (
        <>
          <path d={path} fill="none" stroke="#0891b2" strokeOpacity="0.34" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" stroke="#5eead4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" stroke="#f8fafc" strokeOpacity="0.92" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {start ? <Endpoint point={start} label="Inicio" tone="start" /> : null}
          {end ? <Endpoint point={end} label="Fin" tone="end" /> : null}
        </>
      ) : (
        <g>
          <rect x="175" y="124" width="450" height="138" rx="28" fill="#94a3b8" opacity="0.14" />
          <text x="400" y="188" textAnchor="middle" fill="#cbd5e1" fontSize="30" fontWeight="800">Sin traza disponible</text>
          <text x="400" y="226" textAnchor="middle" fill="#94a3b8" fontSize="19" fontWeight="600">Métricas listas para compartir</text>
        </g>
      )}
    </svg>
  );
}

function Endpoint({ point, label, tone }: { point: { x: number; y: number }; label: string; tone: "start" | "end" }) {
  const fill = tone === "start" ? "#34d399" : "#fb7185";
  return (
    <g>
      <rect x={point.x - 42} y={point.y - 52} width="84" height="28" rx="14" fill="#020617" opacity="0.78" />
      <text x={point.x} y={point.y - 32} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="800">{label.toUpperCase()}</text>
      <circle cx={point.x} cy={point.y} r="17" fill={fill} stroke="#f8fafc" strokeWidth="6" />
    </g>
  );
}

function buildSvgPath(coordinates: RideRouteCoordinate[]): string {
  return projectCoordinates(coordinates)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function projectCoordinates(coordinates: RideRouteCoordinate[]): Array<{ x: number; y: number }> {
  const lngs = coordinates.map((coord) => coord[0]);
  const lats = coordinates.map((coord) => coord[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngSpan = Math.max(maxLng - minLng, 0.00001);
  const latSpan = Math.max(maxLat - minLat, 0.00001);
  const viewport = { x: 64, y: 48, width: 672, height: 294 };
  const scale = Math.min(viewport.width / lngSpan, viewport.height / latSpan);
  const routeWidth = lngSpan * scale;
  const routeHeight = latSpan * scale;
  const offsetX = viewport.x + (viewport.width - routeWidth) / 2;
  const offsetY = viewport.y + (viewport.height - routeHeight) / 2;

  return coordinates.map(([lng, lat]) => ({
    x: offsetX + (lng - minLng) * scale,
    y: offsetY + (maxLat - lat) * scale
  }));
}
