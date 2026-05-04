"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { getTrackingQualityLabel, readLocalPreferences, type TrackingQuality } from "@/features/settings/lib/local-preferences";
import { cn } from "@/lib/utils/cn";
import type { SegmentAttempt, SegmentAttemptStatus } from "@/types/domain";
import { createClient } from "@/lib/supabase/browser";

import { GpsFilterEngine, type GpsFilterConfig } from "../lib/gps-filters";
import type { GpsFix, TrackPoint } from "../lib/tracking-types";
import { useRideSimulator } from "../hooks/use-ride-simulator";
import { detectSegmentAttempts, type SegmentDefinition } from "../lib/segment-attempt-detector";
import {
  SegmentLiveTracker,
  type SegmentLiveSnapshot,
  type SegmentLiveStatus,
} from "../lib/segment-live-tracker";
import {
  buildSegmentAttemptSyncKey,
  createSegmentAttemptsLocalService,
  type SegmentAttemptOutcome,
} from "../services/segment-attempts-local-service";
import { createTrackingService, mapDomainAttemptToBackendInsert } from "../services/tracking-service";

interface RecordingPanelProps {
  riderId: string;
  className?: string;
  onMetricsUpdate?: (metrics: RideMetrics) => void;
  onRouteUpdate?: (route: [number, number][]) => void;
  onCurrentPositionUpdate?: (position: [number, number] | null) => void;
  onTrackPointsUpdate?: (points: LiveTrackPoint[]) => void;
  activeSegment?: SegmentDefinition | null;
  onRecordingStarted?: () => void;
  onSegmentSnapshotUpdate?: (snapshot: SegmentLiveSnapshot | null) => void;
  onRideStateChange?: (state: RecordingPanelState) => void;
  /** Route geometry for the simulator to use instead of demo route */
  plannedRouteCoordinates?: [number, number][];
}

export type RecordingStatus = "idle" | "countdown" | "starting" | "recording" | "paused" | "saving";

export interface RecordingPanelState {
  status: RecordingStatus;
  metrics: RideMetrics;
  gpsStatus: string;
  gpsAccuracyM: number | null;
  precisionStatus: string;
  hasLiveFix: boolean;
  panelMessage: string;
  movingTimeLabel: string;
  trackingQualityLabel: string;
  activeSegmentName: string | null;
  segmentSnapshot: SegmentLiveSnapshot | null;
  actions: {
    pause: () => void;
    resume: () => void;
    finish: () => void;
  };
}

export interface RideMetrics {
  speedKmh: number;
  maxSpeedKmh: number;
  distanceM: number;
  avgSpeedKmh: number;
  movingTimeSec: number;
  pointsAccepted: number;
}

export interface LiveTrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speedKmh: number | null;
  accuracyM: number | null;
  headingDegrees?: number | null;
}

const MAP_MATCHING_ENABLED = process.env.NEXT_PUBLIC_TRACKING_MAP_MATCHING_ENABLED === "true";
const RIDE_SIMULATOR_ENABLED = process.env.NODE_ENV === "development";

interface MapMatchingApiResponse {
  points?: TrackPoint[];
  provider?: string;
  isFallback?: boolean;
  reason?: string;
}

interface PostRideDetectedAttempt {
  segmentId: string;
  elapsedTimeSec: number;
  onRouteRatio: number;
  startedAt: number;
  endedAt: number;
}

interface PendingRidePoints {
  rideId: string;
  points: TrackPoint[];
  error: string;
  updatedAt: number;
}

interface AttemptUiFeedback {
  status: SegmentAttemptStatus;
  elapsedSec: number | null;
  isPersonalBest: boolean;
  estimatedRank: number | null;
  reason: string | null;
}

function buildTrackingProfile(quality: TrackingQuality): {
  config: GpsFilterConfig;
  watchOptions: PositionOptions;
} {
  if (quality === "max") {
    return {
      config: {
        maxAccuracyM: 30,
        warmupDurationMs: 1500,
        warmupAccuracyM: 30,
        warmupGoodFixes: 1,
        stopSpeedKmh: 1.5,
        stopStreak: 3,
        maxJumpM: 100,
        maxJumpDeltaS: 2,
        smoothingAlpha: 0.35,
        maxSegmentDistanceM: 200,
        minMoveFloorM: 3
      },
      watchOptions: { enableHighAccuracy: true, maximumAge: 400, timeout: 12000 }
    };
  }

  if (quality === "battery") {
    return {
      config: {
        maxAccuracyM: 60,
        warmupDurationMs: 2000,
        warmupAccuracyM: 60,
        warmupGoodFixes: 1,
        stopSpeedKmh: 2.2,
        stopStreak: 5,
        maxJumpM: 180,
        maxJumpDeltaS: 2,
        smoothingAlpha: 0.2,
        maxSegmentDistanceM: 350,
        minMoveFloorM: 6
      },
      watchOptions: { enableHighAccuracy: false, maximumAge: 4000, timeout: 18000 }
    };
  }

  return {
      config: {
        maxAccuracyM: 50,
        warmupDurationMs: 1500,
        warmupAccuracyM: 50,
        warmupGoodFixes: 1,
        stopSpeedKmh: 2,
        stopStreak: 4,
        maxJumpM: 150,
        maxJumpDeltaS: 2,
        smoothingAlpha: 0.25,
        maxSegmentDistanceM: 300,
        minMoveFloorM: 5
      },
      watchOptions: { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    };
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

export function RecordingPanel({
  riderId,
  className,
  onMetricsUpdate,
  onRouteUpdate,
  onCurrentPositionUpdate,
  onTrackPointsUpdate,
  activeSegment,
  onRecordingStarted,
  onSegmentSnapshotUpdate,
  onRideStateChange,
  plannedRouteCoordinates,
}: RecordingPanelProps) {
  const service = useMemo(() => createTrackingService(createClient()), []);
  const attemptsLocalService = useMemo(() => createSegmentAttemptsLocalService(), []);
  const reduced = useReducedMotion();

  const watchIdRef = useRef<number | null>(null);
  const routeRef = useRef<[number, number][]>([]);
  const liveTrackPointsRef = useRef<LiveTrackPoint[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const rideIdRef = useRef<string | null>(null);
  const segmentTrackerRef = useRef<SegmentLiveTracker | null>(null);
  const isDemoRideRef = useRef(false);
  const pendingRidePointsRef = useRef<PendingRidePoints | null>(null);

  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [metrics, setMetrics] = useState<RideMetrics>({
    speedKmh: 0,
    maxSpeedKmh: 0,
    distanceM: 0,
    avgSpeedKmh: 0,
    movingTimeSec: 0,
    pointsAccepted: 0,
  });
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | null>(null);
  const [lastFixAt, setLastFixAt] = useState<number | null>(null);
  const [panelMessage, setPanelMessage] = useState("Listo para iniciar tu rodada.");
  const [segments, setSegments] = useState<SegmentDefinition[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [trackingQuality, setTrackingQuality] = useState<TrackingQuality>("balanced");
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [hasInitialFix, setHasInitialFix] = useState(false);
  const [routeVersion, setRouteVersion] = useState(0);
  const [segmentSnapshot, setSegmentSnapshot] = useState<SegmentLiveSnapshot | null>(null);
  const [attemptFeedback, setAttemptFeedback] = useState<AttemptUiFeedback | null>(null);
  const [attemptSyncStatus, setAttemptSyncStatus] = useState<"synced" | "pending" | null>(null);
  const [isDemoRide, setIsDemoRide] = useState(false);
  const lastSegmentStatusRef = useRef<SegmentLiveStatus | null>(null);

  useEffect(() => {
    const local = readLocalPreferences();
    setTrackingQuality(local.trackingQuality);

    const handleStorage = () => {
      const updated = readLocalPreferences();
      setTrackingQuality(updated.trackingQuality);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const trackingProfile = useMemo(() => buildTrackingProfile(trackingQuality), [trackingQuality]);
  const engine = useMemo(() => new GpsFilterEngine(trackingProfile.config), [trackingProfile.config]);

  const isRecording = status === "recording";
  const hasLiveFix = lastFixAt !== null && Date.now() - lastFixAt <= 8000;
  const recordingStatus = isRecording ? "Grabando" : status === "paused" ? "Pausado" : "Listo";
  const gpsStatus =
    (status === "starting" || isRecording) && !hasInitialFix
      ? "Buscando fix"
      : hasLiveFix
        ? "GPS estable"
        : "GPS inestable";
  const precisionStatus = gpsAccuracyM ? `${Math.round(gpsAccuracyM)} m` : "Sin fix";
  const movingMinutes = Math.floor(metrics.movingTimeSec / 60).toString().padStart(2, "0");
  const movingSeconds = (metrics.movingTimeSec % 60).toString().padStart(2, "0");

  const maybeMapMatchTrace = useCallback(async (points: TrackPoint[]): Promise<TrackPoint[]> => {
    if (!MAP_MATCHING_ENABLED || points.length < 2) {
      return points;
    }

    try {
      const response = await fetch("/api/routing/map-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, rolloutKey: riderId })
      });

      if (!response.ok) {
        return points;
      }

      const data = (await response.json()) as MapMatchingApiResponse;
      if (!Array.isArray(data.points) || data.points.length !== points.length) {
        return points;
      }

      return data.points;
    } catch {
      return points;
    }
  }, [riderId]);

  // Load segments on mount
  useEffect(() => {
    async function loadSegments() {
      try {
        const loadedSegments = await service.listTrackableSegments();
        setSegments(loadedSegments);
      } catch (error) {
        console.error("No se pudieron cargar segmentos para deteccion de intentos", error);
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
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
      }
    };
  }, []);

  // Notify parent of metrics changes
  useEffect(() => {
    onMetricsUpdate?.(metrics);
  }, [metrics, onMetricsUpdate]);

  // Notify parent of route changes
  useEffect(() => {
    onRouteUpdate?.([...routeRef.current]);
  }, [routeVersion, onRouteUpdate]);

  useEffect(() => {
    onCurrentPositionUpdate?.(currentPosition);
  }, [currentPosition, onCurrentPositionUpdate]);

  useEffect(() => {
    onTrackPointsUpdate?.([...liveTrackPointsRef.current]);
  }, [routeVersion, onTrackPointsUpdate]);

  useEffect(() => {
    onSegmentSnapshotUpdate?.(segmentSnapshot);
  }, [onSegmentSnapshotUpdate, segmentSnapshot]);

  useEffect(() => {
    if (!activeSegment) {
      segmentTrackerRef.current = null;
      setSegmentSnapshot(null);
      setAttemptFeedback(null);
      lastSegmentStatusRef.current = null;
      return;
    }

    const tracker = new SegmentLiveTracker(activeSegment);
    segmentTrackerRef.current = tracker;
    const initialSnapshot = tracker.getSnapshot();
    setSegmentSnapshot(initialSnapshot);
    setAttemptFeedback(null);
    lastSegmentStatusRef.current = initialSnapshot.status;
  }, [activeSegment]);

  useEffect(() => {
    if (!segmentSnapshot || !activeSegment) return;

    const previousStatus = lastSegmentStatusRef.current;
    if (previousStatus === segmentSnapshot.status) return;
    lastSegmentStatusRef.current = segmentSnapshot.status;

    if (segmentSnapshot.status === "active") {
      setAttemptFeedback(null);
      setPanelMessage("Intento iniciado: segmento en curso.");
      return;
    }

    if (segmentSnapshot.status === "completed") {
      const liveAttempt = createLiveAttemptFromSnapshot({
        snapshot: segmentSnapshot,
        activeSegment,
        riderId,
        rideId: rideIdRef.current,
      });

      if (!liveAttempt) return;

      const outcome = attemptsLocalService.getAttemptOutcome(liveAttempt);
      setAttemptFeedback({
        status: "completed",
        elapsedSec: outcome.elapsedSec,
        isPersonalBest: outcome.isPersonalBest,
        estimatedRank: outcome.estimatedRank,
        reason: null,
      });

      setPanelMessage(buildCompletedPanelMessage(outcome));
      return;
    }

    if (segmentSnapshot.status === "abandoned" || segmentSnapshot.status === "invalid") {
      setAttemptFeedback({
        status: segmentSnapshot.status,
        elapsedSec: segmentSnapshot.elapsedSec,
        isPersonalBest: false,
        estimatedRank: null,
        reason: segmentSnapshot.reason,
      });

      if (segmentSnapshot.status === "abandoned") {
        setPanelMessage("Intento abandonado por desvio o perdida de continuidad.");
        return;
      }

      setPanelMessage("Intento invalido por teletransporte o cierre demasiado rapido.");
    }
  }, [activeSegment, attemptsLocalService, riderId, segmentSnapshot]);

  const resetRecordingData = useCallback(() => {
    routeRef.current = [];
    liveTrackPointsRef.current = [];
    setRouteVersion(version => version + 1);
    setLastFixAt(null);
    setGpsAccuracyM(null);
    setCurrentPosition(null);
    setHasInitialFix(false);
    setMetrics({ speedKmh: 0, maxSpeedKmh: 0, distanceM: 0, avgSpeedKmh: 0, movingTimeSec: 0, pointsAccepted: 0 });
    if (segmentTrackerRef.current) {
      const resetSnapshot = segmentTrackerRef.current.reset();
      setSegmentSnapshot(resetSnapshot);
      setAttemptFeedback(null);
      setAttemptSyncStatus(null);
      lastSegmentStatusRef.current = resetSnapshot.status;
    }
  }, []);

  const ingestTrackingFix = useCallback((fix: GpsFix) => {
    const nextPosition: [number, number] = [fix.lng, fix.lat];
    setCurrentPosition(nextPosition);
    onCurrentPositionUpdate?.(nextPosition);
    setHasInitialFix(true);

    setGpsAccuracyM(typeof fix.accuracyM === "number" ? fix.accuracyM : null);
    setLastFixAt(fix.timestamp);

    const result = (() => {
      try {
        const res = engine.ingestDetailed(fix);
        console.log('[GPS] fix:', fix.accuracyM, 'warmupLocked:', res.metrics.warmupLocked, 'accOk:', res.rejectedByAccuracy, 'teleport:', res.rejectedByTeleport);
        return res;
      } catch (e) {
        console.error('[GPS] engine error:', e);
        return null;
      }
    })();

    if (!result) {
      setPanelMessage("Recibiendo GPS... esperando fix valido.");
      return;
    }

    const newMetrics: RideMetrics = {
      speedKmh: result.metrics.speedKmh,
      maxSpeedKmh: result.metrics.maxSpeedKmh,
      distanceM: result.metrics.distanceM,
      avgSpeedKmh: result.metrics.distanceM > 0 && result.metrics.movingTimeSec > 0
        ? (result.metrics.distanceM / 1000) / (result.metrics.movingTimeSec / 3600)
        : 0,
      movingTimeSec: result.metrics.movingTimeSec,
      pointsAccepted: result.metrics.pointsAccepted,
    };

    setMetrics(newMetrics);

    const canAppendPoint =
      !result.metrics.warmupLocked &&
      !result.rejectedByAccuracy &&
      !result.rejectedByTeleport &&
      (result.acceptedForMetrics || routeRef.current.length === 0);

    if (canAppendPoint) {
      routeRef.current.push(nextPosition);
      liveTrackPointsRef.current.push({
        lat: fix.lat,
        lng: fix.lng,
        timestamp: fix.timestamp,
        speedKmh: Number.isFinite(newMetrics.speedKmh) ? newMetrics.speedKmh : null,
        accuracyM: typeof fix.accuracyM === "number" ? fix.accuracyM : null,
        headingDegrees: getFixHeadingDegrees(fix),
      });

      if (segmentTrackerRef.current) {
        const nextSnapshot = segmentTrackerRef.current.ingest({
          lat: fix.lat,
          lng: fix.lng,
          timestamp: fix.timestamp,
          accuracyM: typeof fix.accuracyM === "number" ? fix.accuracyM : null,
        });
        setSegmentSnapshot(nextSnapshot);
      }

      setRouteVersion(version => version + 1);
      onRouteUpdate?.([...routeRef.current]);
      onTrackPointsUpdate?.([...liveTrackPointsRef.current]);
    }

    if (result.metrics.warmupLocked) {
      setPanelMessage(isDemoRideRef.current ? "Preparando demo..." : "Buscando GPS...");
    } else {
      setPanelMessage(`${isDemoRideRef.current ? "Demo" : "Grabando"}: ${(result.metrics.distanceM / 1000).toFixed(2)} km`);
    }
  }, [engine, onCurrentPositionUpdate, onRouteUpdate, onTrackPointsUpdate]);

  const rideSimulator = useRideSimulator({
    onFix: ingestTrackingFix,
    onComplete: () => {
      if (!isDemoRideRef.current) return;
      setStatus("paused");
      setMetrics(prev => ({ ...prev, speedKmh: 0 }));
      setPanelMessage("Demo completada. Finalizá para guardar la rodada simulada.");
    },
    customRouteCoordinates: plannedRouteCoordinates,
  });

  function beginWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const timestamp = Date.now();
        const rawSpeed = position.coords.speed;
        const speedMs = typeof rawSpeed === "number" && Number.isFinite(rawSpeed) && rawSpeed >= 0
          ? rawSpeed
          : null;
        const fix = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp,
          accuracyM: position.coords.accuracy ?? null,
          speedMs,
          headingDegrees: position.coords.heading,
          altitudeM: position.coords.altitude ?? null,
        };

        try {
          ingestTrackingFix(fix);
        } catch (error) {
          console.warn("[GPS] No se pudo procesar el fix local", error);
          setPanelMessage("Recibiendo GPS... esperando fix valido.");
        }
      },
      () => {
        setPanelMessage("Error de GPS. Verifica permisos.");
      },
      trackingProfile.watchOptions
    );
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPanelMessage("Tu navegador no soporta geolocalización.");
      return;
    }

    setSaveError(null);
    setStatus("countdown");
    setCountdownValue(3);
    setPanelMessage("Prepárate...");
    
    isDemoRideRef.current = false;
    setIsDemoRide(false);
    rideSimulator.stop();
    resetRecordingData();

    // Clear any existing countdown timeout
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
    }

    // Start countdown: 3 -> 2 -> 1 -> 0 -> GO!
    const runCountdown = async (value: number) => {
      setCountdownValue(value);
      
      if (value > 0) {
        countdownTimeoutRef.current = setTimeout(() => {
          runCountdown(value - 1);
        }, 1000);
      } else {
        // Countdown finished - actually start recording
        countdownTimeoutRef.current = null;
        await actuallyStartRecording();
      }
    };

    // Start countdown after setting state
    countdownTimeoutRef.current = setTimeout(() => {
      runCountdown(2); // Continue from 2 (already showed 3)
    }, 1000);
  }

  async function actuallyStartRecording() {
    setStatus("starting");
    setPanelMessage("Iniciando grabacion...");

    try {
      const rideId = await service.startRide(riderId);
      rideIdRef.current = rideId;
      startTimeRef.current = Date.now();
    } catch (error) {
      setStatus("idle");
      setCountdownValue(null);
      setSaveError(error instanceof Error ? error.message : "No se pudo iniciar la rodada.");
      setPanelMessage("Error al iniciar. Intenta de nuevo.");
      return;
    }

    engine.start(Date.now());
    console.log('[ENGINE] started with config:', trackingProfile.config);
    setStatus("recording");
    setCountdownValue(null);
    setMetrics({ speedKmh: 0, maxSpeedKmh: 0, distanceM: 0, avgSpeedKmh: 0, movingTimeSec: 0, pointsAccepted: 0 });
    setPanelMessage("Buscando fix inicial de GPS...");
    beginWatch();
    onRecordingStarted?.();
  }

  async function startDemoRecording() {
    if (!RIDE_SIMULATOR_ENABLED || isRecording || status === "countdown" || status === "starting" || status === "saving" || status === "paused") {
      return;
    }

    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setSaveError(null);
    setStatus("starting");
    setPanelMessage("Iniciando demo...");
    isDemoRideRef.current = true;
    setIsDemoRide(true);
    resetRecordingData();

    try {
      const rideId = await service.startRide(riderId);
      rideIdRef.current = rideId;
      startTimeRef.current = Date.now();
    } catch (error) {
      isDemoRideRef.current = false;
      setIsDemoRide(false);
      setStatus("idle");
      setSaveError(error instanceof Error ? error.message : "No se pudo iniciar la rodada demo.");
      setPanelMessage("Error al iniciar demo. Intenta de nuevo.");
      return;
    }

    engine.start(Date.now());
    console.log('[ENGINE] started demo with config:', trackingProfile.config);
    setStatus("recording");
    setPanelMessage("Demo activa: reproduciendo rodada simulada...");
    rideSimulator.start();
    onRecordingStarted?.();
  }

  function pauseRecording() {
    if (isDemoRideRef.current) {
      rideSimulator.pause();
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus("paused");
    setMetrics(prev => ({ ...prev, speedKmh: 0 }));
    setPanelMessage("Grabacion pausada.");
  }

  function resumeRecording() {
    if (!rideIdRef.current) {
      setPanelMessage("No hay rodada en pausa para reanudar.");
      return;
    }
    if (isDemoRideRef.current) {
      setStatus("recording");
      setPanelMessage("Demo reanudada.");
      rideSimulator.resume();
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPanelMessage("Tu navegador no soporta geolocalización.");
      return;
    }

    setStatus("recording");
    setPanelMessage("Rodada reanudada. Buscando fix estable...");
    beginWatch();
  }

  async function finishRecording() {
    if (isDemoRideRef.current) {
      rideSimulator.stop();
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (!startTimeRef.current || !rideIdRef.current) {
      setStatus("idle");
      setPanelMessage("No hay rodada activa.");
      return;
    }

    const movingTimeSec = Math.max(1, metrics.movingTimeSec);
    const allPoints = engine.getAllPoints();

    const detectedAttempts = detectSegmentAttempts(
      allPoints.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp })),
      activeSegment ? [activeSegment] : segments
    );

    const liveAttempt = activeSegment
      ? createLiveAttemptFromSnapshot({
          snapshot: segmentSnapshot,
          activeSegment,
          riderId,
          rideId: rideIdRef.current,
        })
      : null;

    const localAttempts = buildAttemptsForLocalPersistence({
      rideId: rideIdRef.current,
      riderId,
      activeSegment: activeSegment ?? null,
      liveAttempt,
      detectedAttempts,
    });

    setStatus("saving");
    setPanelMessage("Guardando rodada...");

    try {
      if (allPoints.length === 0 && !pendingRidePointsRef.current) {
        setStatus("paused");
        setSaveError("No hay puntos locales para sincronizar.");
        setPanelMessage("No hay puntos locales para guardar. La rodada queda pausada.");
        return;
      }

      const activeRideId = rideIdRef.current;
      const pendingForRide = pendingRidePointsRef.current?.rideId === activeRideId
        ? pendingRidePointsRef.current.points
        : null;
      const pointsToPersist = pendingForRide ?? await maybeMapMatchTrace(allPoints);

      try {
        await service.saveRidePoints(activeRideId, pointsToPersist);
        if (pendingRidePointsRef.current?.rideId === activeRideId) {
          pendingRidePointsRef.current = null;
        }
      } catch (pointsError) {
        const message = pointsError instanceof Error ? pointsError.message : "No se pudieron sincronizar puntos.";
        pendingRidePointsRef.current = {
          rideId: activeRideId,
          points: pointsToPersist,
          error: message,
          updatedAt: Date.now(),
        };
        console.warn("[Tracking] Ride points pending sync", pointsError);
        setStatus("paused");
        setSaveError(message);
        setPanelMessage("No se pudo sincronizar con servidor. La rodada continúa localmente.");
        return;
      }

      await service.finalizeRide(rideIdRef.current, {
        distanceM: metrics.distanceM,
        movingTimeSec,
        elevationGainM: 0,
      });

      const persistedAttempts = attemptsLocalService.saveAttemptsForRide(rideIdRef.current, localAttempts);
      const pendingAttempts = attemptsLocalService.listPendingAttemptsByRide(rideIdRef.current);

      let syncStatus: "synced" | "pending" | null = pendingAttempts.length ? "pending" : null;

      if (pendingAttempts.length > 0) {
        try {
          await service.saveSegmentAttempts(
            rideIdRef.current,
            riderId,
            pendingAttempts.map((attempt) => mapDomainAttemptToBackendInsert(attempt))
          );
          attemptsLocalService.markAttemptsSyncState(
            rideIdRef.current,
            pendingAttempts.map((attempt) => attempt.id),
            "synced"
          );
          syncStatus = "synced";
        } catch (syncError) {
          attemptsLocalService.markAttemptsSyncState(
            rideIdRef.current,
            pendingAttempts.map((attempt) => attempt.id),
            "failed",
            syncError instanceof Error ? syncError.message : "sync_failed"
          );
          syncStatus = "pending";
        }
      }

      setAttemptSyncStatus(syncStatus);

      const completedLiveAttempt =
        liveAttempt?.status === "completed"
          ? persistedAttempts.find((attempt) => attempt.syncKey === liveAttempt.syncKey && attempt.status === "completed") ??
            liveAttempt
          : null;
      if (completedLiveAttempt) {
        const persistedOutcome = attemptsLocalService.getAttemptOutcome(completedLiveAttempt);
        setAttemptFeedback({
          status: "completed",
          elapsedSec: persistedOutcome.elapsedSec,
          isPersonalBest: persistedOutcome.isPersonalBest,
          estimatedRank: persistedOutcome.estimatedRank,
          reason: null,
        });
      }

      const hasAttempts = localAttempts.length > 0;
      const syncMessage =
        syncStatus === "synced"
          ? "Intento sincronizado."
          : syncStatus === "pending"
            ? "Pendiente de sincronizacion."
            : "";

      setPanelMessage(
        hasAttempts
          ? `Rodada guardada. ${localAttempts.length} intento(s) detectado(s). ${syncMessage}`.trim()
          : "Rodada guardada. Sin intentos en segmentos."
      );
      setStatus("idle");
      startTimeRef.current = null;
      rideIdRef.current = null;
      isDemoRideRef.current = false;
      setIsDemoRide(false);
    } catch (error) {
      setStatus("paused");
      setSaveError(error instanceof Error ? error.message : "Error al guardar.");
      setPanelMessage("Error al guardar. Intenta de nuevo.");
    }
  }

  const rideState = useMemo<RecordingPanelState>(() => ({
    status,
    metrics,
    gpsStatus,
    gpsAccuracyM,
    precisionStatus,
    hasLiveFix,
    panelMessage,
    movingTimeLabel: `${movingMinutes}:${movingSeconds}`,
    trackingQualityLabel: getTrackingQualityLabel(trackingQuality),
    activeSegmentName: activeSegment?.name ?? null,
    segmentSnapshot,
    actions: {
      pause: pauseRecording,
      resume: resumeRecording,
      finish: finishRecording,
    },
  }), [
    activeSegment?.name,
    gpsAccuracyM,
    gpsStatus,
    hasLiveFix,
    metrics,
    movingMinutes,
    movingSeconds,
    panelMessage,
    precisionStatus,
    segmentSnapshot,
    status,
    trackingQuality,
  ]);

  useEffect(() => {
    onRideStateChange?.(rideState);
  }, [onRideStateChange, rideState]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Live metrics */}
      <Card className="sticky top-2 z-20 border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:top-3 sm:p-5 lg:static lg:top-auto lg:z-auto lg:bg-white lg:shadow-none lg:backdrop-blur-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-900">Metricas en vivo</h3>
          <span className="chip min-h-8">{isDemoRide ? "Demo" : "GPS filtrado"}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard 
            label="Velocidad" 
            value={metrics.speedKmh} 
            unit="km/h"
            highlight={isRecording}
            reduced={reduced}
          />
          <MetricCard 
            label="Velocidad max" 
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:px-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tiempo mov.</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              {movingMinutes}:{movingSeconds}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 pt-2 text-[10px] text-slate-500 sm:text-[11px]">
          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${isRecording ? "bg-emerald-500" : "bg-slate-400"}`} />
            {recordingStatus}
          </span>
          <span>{gpsStatus}</span>
          <span>
            Precision: {precisionStatus}
          </span>
          <span>{getTrackingQualityLabel(trackingQuality)}</span>
        </div>

        <p className="mt-2 text-xs text-slate-500" role="status" aria-live="polite">
          {panelMessage}
        </p>
      </Card>

      {/* Active segment indicator */}
      {activeSegment && (
        <Card className={`p-3.5 ${getSegmentStatusPalette(segmentSnapshot?.status ?? "idle")}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getSegmentStatusDot(segmentSnapshot?.status ?? "idle")}`} />
              <span className="text-sm font-medium">Segmento: {activeSegment.name}</span>
            </div>
            <span className="rounded-md border border-current/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {getSegmentStatusLabel(segmentSnapshot?.status ?? "idle")}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <p>Progreso: <span className="font-semibold tabular-nums">{Math.round(segmentSnapshot?.progressPct ?? 0)}%</span></p>
            <p>Tiempo: <span className="font-semibold tabular-nums">{formatElapsed(segmentSnapshot?.elapsedSec ?? 0)}</span></p>
            <p>Dist. inicio: <span className="font-semibold tabular-nums">{formatMeters(segmentSnapshot?.distanceToStartM ?? Number.POSITIVE_INFINITY)}</span></p>
            <p>Dist. meta: <span className="font-semibold tabular-nums">{formatMeters(segmentSnapshot?.distanceToEndM ?? Number.POSITIVE_INFINITY)}</span></p>
          </div>

          {segmentSnapshot?.reason && (
            <p className="mt-2 text-[11px] font-medium">Motivo: {getSegmentReasonLabel(segmentSnapshot.reason)}</p>
          )}

          {attemptFeedback && (
            <div className="mt-2 rounded-lg border border-current/25 bg-white/55 px-2.5 py-2 text-[11px]">
              <p className="font-semibold">{getAttemptFeedbackHeadline(attemptFeedback)}</p>
              {attemptFeedback.status === "completed" && attemptFeedback.elapsedSec !== null && (
                <p className="mt-1">
                  Tiempo final {formatElapsed(attemptFeedback.elapsedSec)}
                  {attemptFeedback.isPersonalBest ? " - Nuevo PB" : ""}
                  {typeof attemptFeedback.estimatedRank === "number" ? ` - Puesto local #${attemptFeedback.estimatedRank}` : ""}
                </p>
              )}
              {attemptFeedback.status !== "completed" && (
                <p className="mt-1">
                  {formatAttemptFeedbackReason(attemptFeedback.reason)}
                </p>
              )}
              {attemptSyncStatus && (
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">
                  {attemptSyncStatus === "synced" ? "Intento sincronizado" : "Pendiente de sincronizacion"}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Controls */}
      <Card className="p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-4">
          <Button 
            onClick={startRecording} 
            disabled={isRecording || status === "countdown" || status === "starting" || status === "saving" || status === "paused"}
            className="min-h-11 w-full"
          >
            {status === "countdown" ? `Preparate...` : status === "starting" ? "Iniciando..." : isRecording ? "Grabando..." : "Iniciar"}
          </Button>
          {RIDE_SIMULATOR_ENABLED && status === "idle" && (
            <Button
              variant="secondary"
              onClick={startDemoRecording}
              className="min-h-11 w-full"
            >
              Simular rodada
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={pauseRecording} 
            disabled={!isRecording}
            className="min-h-11 w-full"
          >
            Pausar
          </Button>
          <Button 
            variant="secondary"
            onClick={resumeRecording}
            disabled={status !== "paused"}
            className="min-h-11 w-full"
          >
            Reanudar
          </Button>
          <Button 
            variant="ghost" 
            onClick={finishRecording} 
            disabled={status === "idle" || status === "countdown" || status === "starting"}
            className="min-h-11 w-full"
          >
            {status === "saving" ? "Guardando..." : "Finalizar"}
          </Button>
        </div>
        {saveError && <p className="mt-2 text-sm font-medium text-rose-600">{saveError}</p>}
      </Card>

      {/* Countdown overlay */}
      {status === "countdown" && countdownValue !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            <p className="mb-4 text-xl font-medium text-white/80">Prepárate</p>
            <p className="tabular-nums text-[150px] font-bold leading-none text-white drop-shadow-2xl animate-ping-short">
              {countdownValue}
            </p>
            {countdownValue === 0 && (
              <p className="mt-6 text-3xl font-bold text-emerald-400">¡YA!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getFixHeadingDegrees(fix: GpsFix): number | null {
  const heading = (fix as GpsFix & { headingDegrees?: unknown; heading?: unknown }).headingDegrees ??
    (fix as GpsFix & { heading?: unknown }).heading;
  return typeof heading === "number" && Number.isFinite(heading) && heading >= 0 && heading <= 360
    ? heading
    : null;
}

interface LiveAttemptBuildParams {
  snapshot: SegmentLiveSnapshot | null;
  activeSegment: SegmentDefinition;
  riderId: string;
  rideId: string | null;
}

interface BuildLocalAttemptsParams {
  rideId: string;
  riderId: string;
  activeSegment: SegmentDefinition | null;
  liveAttempt: SegmentAttempt | null;
  detectedAttempts: PostRideDetectedAttempt[];
}

function createLiveAttemptFromSnapshot(params: LiveAttemptBuildParams): SegmentAttempt | null {
  const { snapshot, activeSegment, riderId, rideId } = params;
  if (!snapshot || !rideId) return null;

  if (snapshot.status !== "completed" && snapshot.status !== "abandoned" && snapshot.status !== "invalid") {
    return null;
  }

  if (!snapshot.startedAt) return null;

  const completedAtMs = snapshot.completedAt ?? Date.now();
  const startedAt = new Date(snapshot.startedAt).toISOString();
  const completedAt = new Date(completedAtMs).toISOString();
  const roundedElapsed = Math.round(snapshot.elapsedSec);
  const elapsedSec = roundedElapsed > 0 ? roundedElapsed : null;

  return {
    id: crypto.randomUUID(),
    segmentId: activeSegment.id,
    syncKey: buildSegmentAttemptSyncKey({
      riderId,
      rideId,
      segmentId: activeSegment.id,
      startedAt,
    }),
    riderId,
    rideId,
    status: snapshot.status,
    startedAt,
    completedAt,
    elapsedSec,
    progressFinal: clampPct(snapshot.progressPct),
    distanceInSegmentM: null,
    reason: snapshot.reason,
    metadata: {
      source: "live",
      onRouteScore: snapshot.onRouteScore,
    },
    recordedAt: completedAt,
  };
}

function buildAttemptsForLocalPersistence(params: BuildLocalAttemptsParams): SegmentAttempt[] {
  const { rideId, riderId, activeSegment, liveAttempt, detectedAttempts } = params;
  const attempts: SegmentAttempt[] = [];

  if (liveAttempt) {
    attempts.push(liveAttempt);
  }

  const shouldSkipDetectedForActiveSegment = Boolean(
    liveAttempt && activeSegment && liveAttempt.segmentId === activeSegment.id
  );

  for (const detected of detectedAttempts) {
    if (shouldSkipDetectedForActiveSegment && activeSegment?.id === detected.segmentId) {
      continue;
    }

    attempts.push({
      id: crypto.randomUUID(),
      segmentId: detected.segmentId,
      syncKey: buildSegmentAttemptSyncKey({
        riderId,
        rideId,
        segmentId: detected.segmentId,
        startedAt: new Date(detected.startedAt).toISOString(),
      }),
      rideId,
      riderId,
      status: "completed",
      startedAt: new Date(detected.startedAt).toISOString(),
      completedAt: new Date(detected.endedAt).toISOString(),
      elapsedSec: Math.max(1, Math.round(detected.elapsedTimeSec)),
      progressFinal: 100,
      distanceInSegmentM: null,
      reason: null,
      metadata: {
        source: "post_ride",
        onRouteRatio: detected.onRouteRatio,
      },
      recordedAt: new Date(detected.endedAt).toISOString(),
    });
  }

  return attempts;
}

function buildCompletedPanelMessage(outcome: SegmentAttemptOutcome): string {
  const base = `Segmento completado en ${formatElapsed(outcome.elapsedSec ?? 0)}.`;
  const pb = outcome.isPersonalBest ? " Nuevo PB local." : "";
  const ranking = typeof outcome.estimatedRank === "number" ? ` Ranking estimado local #${outcome.estimatedRank}.` : "";
  return `${base}${pb}${ranking}`;
}

function getAttemptFeedbackHeadline(feedback: AttemptUiFeedback): string {
  if (feedback.status === "completed") {
    return feedback.isPersonalBest ? "Completado - Nuevo PB" : "Completado";
  }

  if (feedback.status === "abandoned") return "Intento abandonado";
  return "Intento invalido";
}

function formatAttemptFeedbackReason(reason: string | null): string {
  const normalized = normalizeSegmentReason(reason);
  return normalized ? getSegmentReasonLabel(normalized) : "Sin motivo tecnico";
}

function normalizeSegmentReason(reason: string | null): NonNullable<SegmentLiveSnapshot["reason"]> | null {
  if (reason === "off_route") return "off_route";
  if (reason === "gps_gap") return "gps_gap";
  if (reason === "wrong_direction") return "wrong_direction";
  if (reason === "too_fast_completion") return "too_fast_completion";
  return null;
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function getSegmentStatusLabel(status: SegmentLiveStatus): string {
  if (status === "near_start") return "cerca inicio";
  if (status === "active") return "activo";
  if (status === "completed") return "completado";
  if (status === "abandoned") return "abandonado";
  if (status === "invalid") return "invalido";
  return "idle";
}

function getSegmentStatusPalette(status: SegmentLiveStatus): string {
  if (status === "near_start") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "active") return "border-sky-200 bg-sky-50 text-sky-900";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "abandoned") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "invalid") return "border-slate-300 bg-slate-100 text-slate-800";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function getSegmentStatusDot(status: SegmentLiveStatus): string {
  if (status === "near_start") return "bg-amber-500";
  if (status === "active") return "bg-sky-500 animate-pulse";
  if (status === "completed") return "bg-emerald-500";
  if (status === "abandoned") return "bg-rose-500";
  if (status === "invalid") return "bg-slate-500";
  return "bg-slate-400";
}

function getSegmentReasonLabel(reason: NonNullable<SegmentLiveSnapshot["reason"]>): string {
  if (reason === "off_route") return "Desvio sostenido fuera de la ruta";
  if (reason === "gps_gap") return "Corte largo de GPS";
  if (reason === "wrong_direction") return "Retroceso fuerte en el segmento";
  return "Finalizacion demasiado rapida";
}

function formatElapsed(elapsedSec: number): string {
  const safeSec = Math.max(0, Math.floor(elapsedSec));
  const minutes = Math.floor(safeSec / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSec % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatMeters(distanceM: number): string {
  if (!Number.isFinite(distanceM)) return "--";
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} km`;
  return `${Math.round(distanceM)} m`;
}
