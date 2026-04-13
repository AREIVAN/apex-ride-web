"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { ErrorState } from "@/features/shared/ui/error-state";
import { createClient } from "@/lib/supabase/browser";

import { GpsFilterEngine } from "../lib/gps-filters";
import { detectSegmentAttempts, type SegmentDefinition, type TrackPoint } from "../lib/segment-attempt-detector";
import { createTrackingService } from "../services/tracking-service";

interface RecordingPanelProps {
  riderId: string;
  onMetricsUpdate?: (metrics: RideMetrics) => void;
  onRouteUpdate?: (route: [number, number][]) => void;
  activeSegment?: SegmentDefinition | null;
}

export interface RideMetrics {
  speedKmh: number;
  maxSpeedKmh: number;
  distanceM: number;
  avgSpeedKmh: number;
  movingTimeSec: number;
  pointsAccepted: number;
}

const TILE_LAYER = {
  url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  attribution: '&copy; OpenStreetMap &copy; CARTO',
};

const FALLBACK_CENTER: [number, number] = [-34.6037, -58.3816];

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

function AnimatedNumber({
  value,
  format,
  reduced
}: {
  value: number;
  format: (n: number) => string;
  reduced: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    const start = prevRef.current;
    const end = value;
    const duration = 200;
    const startTime = performance.now();

    function animate(time: number) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevRef.current = end;
      }
    }

    requestAnimationFrame(animate);
  }, [value, reduced]);

  return <span className="tabular-nums">{format(display)}</span>;
}

function MetricCard({
  label,
  value,
  unit, 
  highlight = false,
  reduced
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
  reduced: boolean;
}) {
  return (
    <div className={`rounded-xl border px-3 py-3 sm:px-3.5 ${highlight ? 'border-brand-300 bg-brand-50 shadow-[0_8px_20px_rgba(24,141,170,0.16)]' : 'border-slate-200 bg-slate-50'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-end gap-1">
        <AnimatedNumber 
          value={value} 
          format={(n) => unit === 'km' ? n.toFixed(2) : Math.round(n).toString()}
          reduced={reduced}
        />
        <span className="text-sm font-medium text-slate-600">{unit}</span>
      </div>
    </div>
  );
}

function LoadingDots({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm text-slate-600">{text}</span>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-500" />
      </span>
    </span>
  );
}

function getUserLocation(): Promise<[number, number]> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(FALLBACK_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.longitude, position.coords.latitude]),
      () => resolve(FALLBACK_CENTER),
      { timeout: 10000 }
    );
  });
}

// Live tracking map component
function LiveTrackingMap({ 
  route, 
  currentPosition,
  activeSegment 
}: { 
  route: [number, number][];
  currentPosition: [number, number] | null;
  activeSegment: SegmentDefinition | null;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const routeSource = useRef<maplibregl.GeoJSONSource | null>(null);
  const currentMarker = useRef<maplibregl.Marker | null>(null);
  const segmentSource = useRef<maplibregl.GeoJSONSource | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const containerElement = mapContainer.current;

    getUserLocation().then((center) => {
      map.current = new maplibregl.Map({
        container: containerElement,
        style: {
          version: 8,
          sources: {
            "carto-voyager": {
              type: "raster",
              tiles: [TILE_LAYER.url],
              tileSize: 256,
              attribution: TILE_LAYER.attribution,
            },
          },
          layers: [{ id: "base", type: "raster", source: "carto-voyager", minzoom: 0 }],
        },
        center,
        zoom: 14,
      });

      map.current.on("load", () => {
        map.current?.addControl(new maplibregl.NavigationControl(), "top-right");
        map.current?.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");

        // Add route source
        map.current?.addSource("live-route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
        });

        map.current?.addLayer({
          id: "route-outline",
          type: "line",
          source: "live-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.6 },
        });

        map.current?.addLayer({
          id: "route-line",
          type: "line",
          source: "live-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#0d9488", "line-width": 4, "line-opacity": 0.9 },
        });

        routeSource.current = map.current?.getSource("live-route") as maplibregl.GeoJSONSource;

        // Add segment source
        map.current?.addSource("segment-route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
        });

        map.current?.addLayer({
          id: "segment-line",
          type: "line",
          source: "segment-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#f59e0b", "line-width": 3, "line-opacity": 0.7, "line-dasharray": [2, 1] },
        });

        segmentSource.current = map.current?.getSource("segment-route") as maplibregl.GeoJSONSource;
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update route
  useEffect(() => {
    if (!routeSource.current || route.length === 0) return;

    routeSource.current.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: route },
    });

    // Fit bounds to route
    if (map.current && route.length > 1) {
      const bounds = route.reduce(
        (b, coord) => b.extend(coord as any),
        new maplibregl.LngLatBounds(route[0], route[0])
      );
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 16 });
    }
  }, [route]);

  // Update current position marker
  useEffect(() => {
    if (!map.current || !currentPosition) return;

    if (!currentMarker.current) {
      const el = document.createElement("div");
      el.className = "w-4 h-4 rounded-full bg-brand-600 border-2 border-white shadow-lg animate-pulse";
      currentMarker.current = new maplibregl.Marker({ element: el }).addTo(map.current);
    }

    currentMarker.current.setLngLat(currentPosition);
  }, [currentPosition]);

  // Show active segment
  useEffect(() => {
    if (!segmentSource.current || !activeSegment?.route) return;

    segmentSource.current.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: activeSegment.route.map(p => [p.lng, p.lat]) },
    });
  }, [activeSegment]);

  return (
    <div ref={mapContainer} className="h-full w-full rounded-lg" />
  );
}

export function RecordingPanel({ riderId, onMetricsUpdate, onRouteUpdate, activeSegment }: RecordingPanelProps) {
  const engine = useMemo(() => new GpsFilterEngine(), []);
  const service = useMemo(() => createTrackingService(createClient()), []);
  const reduced = useReducedMotion();

  const watchIdRef = useRef<number | null>(null);
  const routeRef = useRef<[number, number][]>([]);
  const startTimeRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"idle" | "starting" | "recording" | "paused" | "saving">("idle");
  const [metrics, setMetrics] = useState<RideMetrics>({
    speedKmh: 0,
    maxSpeedKmh: 0,
    distanceM: 0,
    avgSpeedKmh: 0,
    movingTimeSec: 0,
    pointsAccepted: 0,
  });
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [panelMessage, setPanelMessage] = useState("Listo para iniciar tu rodada.");
  const [segments, setSegments] = useState<SegmentDefinition[]>([]);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
  const [isSegmentsLoading, setIsSegmentsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isRecording = status === "recording";

  // Load segments on mount
  useEffect(() => {
    async function loadSegments() {
      setIsSegmentsLoading(true);
      try {
        const loadedSegments = await service.listTrackableSegments();
        setSegments(loadedSegments);
      } catch (error) {
        setSegmentsError(error instanceof Error ? error.message : "No se pudieron cargar segmentos.");
      } finally {
        setIsSegmentsLoading(false);
      }
    }
    void loadSegments();
  }, [service]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Notify parent of metrics changes
  useEffect(() => {
    onMetricsUpdate?.(metrics);
  }, [metrics, onMetricsUpdate]);

  // Notify parent of route changes
  useEffect(() => {
    onRouteUpdate?.(routeRef.current);
  }, [metrics.pointsAccepted, onRouteUpdate]);

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPanelMessage("Tu navegador no soporta geolocalización.");
      return;
    }

    setSaveError(null);
    setStatus("starting");
    setPanelMessage("Iniciando grabacion...");
    routeRef.current = [];

    try {
      await service.startRide(riderId);
      startTimeRef.current = Date.now();
    } catch (error) {
      setStatus("idle");
      setSaveError(error instanceof Error ? error.message : "No se pudo iniciar la rodada.");
      return;
    }

    engine.start(Date.now());
    setStatus("recording");
    setMetrics({ speedKmh: 0, maxSpeedKmh: 0, distanceM: 0, avgSpeedKmh: 0, movingTimeSec: 0, pointsAccepted: 0 });
    setPanelMessage("Grabando... GPS activo.");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const timestamp = Date.now();
        const fix = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp,
          accuracyM: position.coords.accuracy ?? null,
          speedMs: position.coords.speed ?? null,
          altitudeM: position.coords.altitude ?? null,
        };

        setCurrentPosition([fix.lng, fix.lat]);

        const result = engine.ingest(fix);
        
        const newMetrics: RideMetrics = {
          speedKmh: result.speedKmh,
          maxSpeedKmh: result.maxSpeedKmh,
          distanceM: result.distanceM,
          avgSpeedKmh: result.distanceM > 0 && result.movingTimeSec > 0 
            ? (result.distanceM / 1000) / (result.movingTimeSec / 3600) 
            : 0,
          movingTimeSec: result.movingTimeSec,
          pointsAccepted: result.pointsAccepted,
        };
        
        setMetrics(newMetrics);

        // Add to route
        routeRef.current.push([fix.lng, fix.lat]);

        if (result.warmupLocked) {
          setPanelMessage("Buscando GPS...");
        } else {
          setPanelMessage(`Grabando: ${(result.distanceM / 1000).toFixed(2)} km`);
        }
      },
      () => {
        setPanelMessage("Error de GPS. Verifica permisos.");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }

  function pauseRecording() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus("paused");
    setPanelMessage("Grabacion pausada.");
  }

  async function finishRecording() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (!startTimeRef.current) {
      setStatus("idle");
      setPanelMessage("No hay rodada activa.");
      return;
    }

    const movingTimeSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const allPoints = engine.getAllPoints();

    // Detect segment attempts
    const attempts = detectSegmentAttempts(
      allPoints.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp })),
      activeSegment ? [activeSegment] : segments
    );

    setStatus("saving");
    setPanelMessage("Guardando rodada...");

    try {
      await service.saveRidePoints(riderId, allPoints);
      
      if (attempts.length > 0) {
        await service.saveSegmentAttempts(
          riderId,
          riderId,
          attempts.map(a => ({ segmentId: a.segmentId, elapsedTimeSec: a.elapsedTimeSec }))
        );
      }

      await service.finalizeRide(riderId, {
        distanceM: metrics.distanceM,
        movingTimeSec,
        elevationGainM: 0,
      });

      setPanelMessage(attempts.length > 0 
        ? `Rodada guardada. ${attempts.length} intento(s) detectado(s).`
        : "Rodada guardada. Sin intentos en segmentos.");
      setStatus("idle");
      routeRef.current = [];
      startTimeRef.current = null;
    } catch (error) {
      setStatus("paused");
      setSaveError(error instanceof Error ? error.message : "Error al guardar.");
      setPanelMessage("Error al guardar. Intenta de nuevo.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Live metrics */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-900">Metrics en vivo</h3>
          <span className="chip min-h-8">GPS filtrado</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard 
            label="Velocidad" 
            value={metrics.speedKmh} 
            unit="km/h"
            highlight={isRecording}
            reduced={reduced}
          />
          <MetricCard 
            label="Max" 
            value={metrics.maxSpeedKmh} 
            unit="km/h"
            reduced={reduced}
          />
          <MetricCard 
            label="Distancia" 
            value={metrics.distanceM / 1000} 
            unit="km"
            reduced={reduced}
          />
          <MetricCard 
            label="Promedio" 
            value={metrics.avgSpeedKmh} 
            unit="km/h"
            reduced={reduced}
          />
        </div>
        
        {/* Time tracking */}
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Tiempo en movimiento</span>
            <span className="font-mono font-bold text-slate-900">
              {Math.floor(metrics.movingTimeSec / 60).toString().padStart(2, '0')}:
              {(metrics.movingTimeSec % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-slate-500" role="status" aria-live="polite">
          {panelMessage}
        </p>
      </Card>

      {/* Active segment indicator */}
      {activeSegment && (
        <Card className="border-amber-200 bg-amber-50 p-3.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-medium text-amber-800">
              Segmento activo: {activeSegment.name}
            </span>
          </div>
        </Card>
      )}

      {/* Controls */}
      <Card className="p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-3">
          <Button 
            onClick={startRecording} 
            disabled={isRecording || status === "starting" || status === "saving"}
            className="min-h-11 w-full"
          >
            {status === "starting" ? "Iniciando..." : isRecording ? "Grabando..." : "Iniciar"}
          </Button>
          <Button 
            variant="secondary" 
            onClick={pauseRecording} 
            disabled={!isRecording}
            className="min-h-11 w-full"
          >
            Pausar
          </Button>
          <Button 
            variant="ghost" 
            onClick={finishRecording} 
            disabled={status === "idle" || status === "starting"}
            className="min-h-11 w-full"
          >
            {status === "saving" ? "Guardando..." : "Finalizar"}
          </Button>
        </div>
        {saveError && <p className="mt-2 text-sm font-medium text-rose-600">{saveError}</p>}
      </Card>

      {/* Segments info */}
      {isSegmentsLoading ? (
        <Card className="p-3.5">
          <LoadingDots text="Cargando segmentos..." />
        </Card>
      ) : segmentsError ? (
        <ErrorState title="Error" description={segmentsError} />
      ) : segments.length === 0 ? (
        <EmptyState title="Sin segmentos" description="No hay segmentos disponibles para intentar en este momento." compact />
      ) : (
        <Card className="p-3">
          <p className="mb-2 text-xs text-slate-500">
            {segments.length} segmento(s) disponible(s) para intentar
          </p>
        </Card>
      )}
    </div>
  );
}
