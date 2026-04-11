"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
}

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

  useLayoutEffect(() => {
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

function SkeletonMetric({ label }: { label: string }) {
  return (
    <div className="animate-pulse rounded-xl bg-slate-200 px-2 py-3">
      <div className="mx-auto h-3 w-12 rounded bg-slate-300" />
      <div className="mx-auto mt-2 h-5 w-16 rounded bg-slate-300" />
    </div>
  );
}

function LoadingDots({ text }: { text: string }) {
  return (
    <span className="inline-flex">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-500" />
      </span>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75 animation-delay-200" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-500 animation-delay-200" />
      </span>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75 animation-delay-400" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-500 animation-delay-400" />
      </span>
    </span>
  );
}

export function RecordingPanel({ riderId }: RecordingPanelProps) {
  const reducedMotion = useReducedMotion();
  const engine = useMemo(() => new GpsFilterEngine(), []);
  const service = useMemo(() => createTrackingService(createClient()), []);

  const watchIdRef = useRef<number | null>(null);
  const ridePointsRef = useRef<TrackPoint[]>([]);
  const rideIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"idle" | "starting" | "recording" | "paused" | "saving">("idle");
  const [distanceM, setDistanceM] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [fixes, setFixes] = useState(0);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [panelMessage, setPanelMessage] = useState("Listo para iniciar captura real por GPS.");
  const [segments, setSegments] = useState<SegmentDefinition[]>([]);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
  const [isSegmentsLoading, setIsSegmentsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isRecording = status === "recording";
  const isLoading = status === "starting" || status === "saving";

  useEffect(() => {
    async function loadSegments() {
      setIsSegmentsLoading(true);
      setSegmentsError(null);

      try {
        const loadedSegments = await service.listTrackableSegments();
        setSegments(loadedSegments);
      } catch (error) {
        setSegmentsError(error instanceof Error ? error.message : "No se pudieron cargar segmentos para detectar intentos.");
      } finally {
        setIsSegmentsLoading(false);
      }
    }

    void loadSegments();
  }, [service]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPanelMessage("Tu navegador no soporta geolocalizacion en tiempo real.");
      return;
    }

    setSaveError(null);
    setStatus("starting");
    setPanelMessage("Creando rodada en Supabase...");

    try {
      const rideId = await service.startRide(riderId);
      rideIdRef.current = rideId;
      startedAtRef.current = Date.now();
    } catch (error) {
      setStatus("idle");
      setSaveError(error instanceof Error ? error.message : "No se pudo iniciar la rodada en la base de datos.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const now = Date.now();
    engine.start(now);
    ridePointsRef.current = [];
    setStatus("recording");
    setDistanceM(0);
    setSpeedKmh(0);
    setMaxSpeedKmh(0);
    setFixes(0);
    setPanelMessage("Buscando lock de GPS para arrancar el tracking...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const timestamp = Date.now();
        const fix = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp,
          accuracyM: position.coords.accuracy ?? null,
          speedMs: position.coords.speed ?? null,
          altitudeM: position.coords.altitude ?? null
        };

        setLastAccuracy(fix.accuracyM);
        const metrics = engine.ingest(fix);

        if (!metrics.warmupLocked) {
          ridePointsRef.current.push({
            lat: fix.lat,
            lng: fix.lng,
            timestamp,
            altitudeM: fix.altitudeM,
            speedMs: fix.speedMs,
            accuracyM: fix.accuracyM
          });
        }

        setDistanceM(metrics.distanceM);
        setSpeedKmh(metrics.speedKmh);
        setMaxSpeedKmh(metrics.maxSpeedKmh);
        setFixes(metrics.pointsAccepted);
        setPanelMessage(metrics.warmupLocked ? "GPS lock en proceso..." : "Grabando trayectoria y metricas.");
      },
      () => {
        setPanelMessage("Error de GPS. Revisa permisos de ubicacion y volve a intentar.");
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
    setPanelMessage("Grabacion pausada. Podes finalizar o iniciar una nueva rodada.");
  }

  async function finishRecording() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const rideId = rideIdRef.current;
    if (!rideId) {
      setStatus("idle");
      setPanelMessage("No hay una rodada activa para finalizar.");
      return;
    }

    const attempts = detectSegmentAttempts(ridePointsRef.current, segments);
    const movingTimeSec = startedAtRef.current ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)) : 0;

    setStatus("saving");
    setPanelMessage("Guardando puntos y resultados en Supabase...");
    setSaveError(null);

    try {
      await service.saveRidePoints(rideId, ridePointsRef.current);
      await service.saveSegmentAttempts(
        rideId,
        riderId,
        attempts.map((attempt) => ({
          segmentId: attempt.segmentId,
          elapsedTimeSec: attempt.elapsedTimeSec
        }))
      );
      await service.finalizeRide(rideId, {
        distanceM,
        movingTimeSec,
        elevationGainM: 0
      });

      setPanelMessage(
        attempts.length
          ? `Rodada finalizada y guardada. ${attempts.length} intento(s) de segmento detectado(s).`
          : "Rodada finalizada y guardada. Sin intentos validos de segmentos."
      );
      setStatus("idle");
      rideIdRef.current = null;
      startedAtRef.current = null;
    } catch (error) {
      setStatus("paused");
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la rodada.");
      setPanelMessage("Hubo un problema al persistir la rodada. Podes reintentar finalizar.");
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">Motorcycle tracking panel</h2>
          {isRecording && (
            <span
              className={`inline-flex h-3 w-3 rounded-full ${reducedMotion ? "bg-rose-500" : "animate-pulse bg-rose-500"}`}
              aria-label="Grabando"
            />
          )}
          {isLoading && <LoadingDots text="" />}
        </div>
        <p className="text-sm text-slate-600">{panelMessage}</p>
      </div>

      {isSegmentsLoading ? <SkeletonMetric label="Cargando..." /> : null}
      {segmentsError ? <ErrorState title="Error cargando segmentos" description={segmentsError} /> : null}
      {!isSegmentsLoading && !segmentsError && !segments.length ? (
        <EmptyState
          title="No hay segmentos disponibles"
          description="Crea segmentos publicos para habilitar deteccion de intentos y leaderboard en tiempo real."
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <Metric
          label="Velocidad"
          value={speedKmh}
          format={(n) => `${Math.round(n)} km/h`}
          reduced={reducedMotion}
          highlight={isRecording && speedKmh > 0}
        />
        <Metric
          label="Max"
          value={maxSpeedKmh}
          format={(n) => `${Math.round(n)} km/h`}
          reduced={reducedMotion}
        />
        <Metric
          label="Distancia"
          value={distanceM / 1000}
          format={(n) => `${n.toFixed(2)} km`}
          reduced={reducedMotion}
        />
        <Metric label="Fixes" value={fixes} format={(n) => `${n}`} reduced={reducedMotion} />
      </div>

      <p className="text-xs text-slate-500">
        Accuracy: {lastAccuracy ? `±${Math.round(lastAccuracy)} m` : "-"}
      </p>
      {saveError ? <p className="text-sm font-medium text-rose-600 animate-shake">{saveError}</p> : null}

      <div className="flex gap-2">
        <Button
          onClick={startRecording}
          disabled={isRecording || status === "starting" || status === "saving"}
          className={status === "starting" ? "opacity-70" : ""}
        >
          {status === "starting" ? "Iniciando..." : "Iniciar"}
        </Button>
        <Button
          variant="secondary"
          onClick={pauseRecording}
          disabled={!isRecording}
          className={!isRecording ? "opacity-50" : ""}
        >
          Pausar
        </Button>
        <Button
          variant="ghost"
          onClick={finishRecording}
          disabled={status === "idle" || status === "starting"}
          className={status === "saving" ? "opacity-70" : ""}
        >
          {status === "saving" ? "Guardando..." : "Finalizar"}
        </Button>
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  format,
  reduced,
  highlight = false
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  reduced: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-2 py-3 transition-colors ${
        highlight ? "bg-amber-50 ring-2 ring-amber-400 ring-offset-1" : "bg-slate-50"
      }`}
      style={{ transitionDuration: reduced ? "0ms" : "200ms" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <AnimatedNumber value={value} format={format} reduced={reduced} />
    </div>
  );
}
