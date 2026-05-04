import { useCallback, useEffect, useRef, useState } from "react";

import { generateDemoRidePoints } from "../lib/generate-demo-ride-points";
import type { GpsFix } from "../lib/tracking-types";

type RideSimulatorStatus = "idle" | "running" | "paused" | "completed";

interface RideSimulatorOptions {
  onFix: (fix: GpsFix) => void;
  onComplete?: () => void;
  /** Custom route coordinates to use instead of demo route */
  customRouteCoordinates?: [number, number][];
}

export function useRideSimulator({ onFix, onComplete, customRouteCoordinates }: RideSimulatorOptions) {
  const [status, setStatus] = useState<RideSimulatorStatus>("idle");
  const pointsRef = useRef<GpsFix[]>([]);
  const cursorRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFixRef = useRef(onFix);
  const onCompleteRef = useRef(onComplete);
  const customRouteRef = useRef(customRouteCoordinates);

  useEffect(() => {
    onFixRef.current = onFix;
  }, [onFix]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    customRouteRef.current = customRouteCoordinates;
  }, [customRouteCoordinates]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const emitNextFix = useCallback(() => {
    const nextPoint = pointsRef.current[cursorRef.current];
    if (!nextPoint) {
      clearTimer();
      setStatus("completed");
      onCompleteRef.current?.();
      return;
    }

    cursorRef.current += 1;

    try {
      onFixRef.current({
        ...nextPoint,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn("[RideSimulator] No se pudo procesar el fix simulado", error);
    }
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    emitNextFix();
    intervalRef.current = setInterval(emitNextFix, 1000);
  }, [clearTimer, emitNextFix]);

  const start = useCallback(() => {
    // Use custom route if provided, otherwise use demo route
    pointsRef.current = generateDemoRidePoints(Date.now(), customRouteRef.current);
    cursorRef.current = 0;
    setStatus("running");
    startTimer();
  }, [startTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setStatus((current) => (current === "running" ? "paused" : current));
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (status !== "paused") return;
    setStatus("running");
    startTimer();
  }, [startTimer, status]);

  const stop = useCallback(() => {
    clearTimer();
    pointsRef.current = [];
    cursorRef.current = 0;
    setStatus("idle");
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    status,
    start,
    pause,
    resume,
    stop,
  };
}