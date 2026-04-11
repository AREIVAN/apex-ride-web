import { clamp, haversineMeters } from "./geo-math";
import {
  gpsFilterConfigSchema,
  gpsFixSchema,
  type GpsFilterConfig,
  type GpsFix
} from "./tracking-types";

export interface TrackingMetrics {
  distanceM: number;
  speedKmh: number;
  maxSpeedKmh: number;
  pointsAccepted: number;
  warmupLocked: boolean;
}

export interface GpsFilterState {
  startedAt: number;
  warmupGood: number;
  lastFix: GpsFix | null;
  speedEma: number;
  stationaryStreak: number;
  metrics: TrackingMetrics;
}

export interface GpsFilterStepResult {
  state: GpsFilterState;
  metrics: TrackingMetrics;
  acceptedForMetrics: boolean;
  rejectedByAccuracy: boolean;
  rejectedByTeleport: boolean;
}

export const defaultGpsFilterConfig: GpsFilterConfig = {
  maxAccuracyM: 40,
  warmupDurationMs: 4000,
  warmupAccuracyM: 35,
  warmupGoodFixes: 2,
  stopSpeedKmh: 2,
  stopStreak: 4,
  maxJumpM: 120,
  maxJumpDeltaS: 2,
  smoothingAlpha: 0.25,
  maxSegmentDistanceM: 250,
  minMoveFloorM: 6
};

const initialMetrics: TrackingMetrics = {
  distanceM: 0,
  speedKmh: 0,
  maxSpeedKmh: 0,
  pointsAccepted: 0,
  warmupLocked: true
};

export function createGpsFilterState(startedAt = 0): GpsFilterState {
  return {
    startedAt,
    warmupGood: 0,
    lastFix: null,
    speedEma: 0,
    stationaryStreak: 0,
    metrics: { ...initialMetrics }
  };
}

export function ingestGpsFix(
  currentState: GpsFilterState,
  rawFix: GpsFix,
  rawConfig: GpsFilterConfig = defaultGpsFilterConfig
): GpsFilterStepResult {
  const fix = gpsFixSchema.parse(rawFix);
  const config = gpsFilterConfigSchema.parse(rawConfig);

  const state = currentState.startedAt ? currentState : createGpsFilterState(fix.timestamp);
  const startedAt = state.startedAt || fix.timestamp;

  const inWarmupWindow = fix.timestamp < startedAt + config.warmupDurationMs;
  const hasWarmupAccuracy = fix.accuracyM !== null && fix.accuracyM <= config.warmupAccuracyM;
  const warmupGood = hasWarmupAccuracy ? state.warmupGood + 1 : state.warmupGood;

  if (inWarmupWindow || warmupGood < config.warmupGoodFixes) {
    const warmupState: GpsFilterState = {
      ...state,
      startedAt,
      warmupGood,
      lastFix: fix,
      metrics: {
        ...state.metrics,
        warmupLocked: true
      }
    };

    return {
      state: warmupState,
      metrics: { ...warmupState.metrics },
      acceptedForMetrics: false,
      rejectedByAccuracy: false,
      rejectedByTeleport: false
    };
  }

  const accOk = fix.accuracyM === null || fix.accuracyM <= config.maxAccuracyM;
  const minMoveM = fix.accuracyM
    ? Math.max(config.minMoveFloorM, fix.accuracyM * 0.3)
    : config.minMoveFloorM;

  const previous = state.lastFix;
  const step = previous ? haversineMeters(previous, fix) : 0;
  const dt = previous ? Math.max(0.5, (fix.timestamp - previous.timestamp) / 1000) : 0.5;
  const isTeleport = Boolean(previous) && step > config.maxJumpM && dt < config.maxJumpDeltaS;

  const canAccumulateDistance =
    accOk && !isTeleport && step >= minMoveM && step <= config.maxSegmentDistanceM;
  const distanceM = canAccumulateDistance ? state.metrics.distanceM + step : state.metrics.distanceM;

  const rawKmh = calculateRawKmh({
    fix,
    previous,
    accOk,
    isTeleport,
    dt,
    step
  });

  const clampedRaw = clamp(rawKmh, 0, 320);
  const looksStopped = accOk && step < minMoveM && clampedRaw < config.stopSpeedKmh;

  const stationaryStreak = looksStopped ? state.stationaryStreak + 1 : accOk ? 0 : state.stationaryStreak;
  const speedEma = accOk
    ? config.smoothingAlpha * clampedRaw + (1 - config.smoothingAlpha) * state.speedEma
    : state.speedEma;

  const speedKmh =
    stationaryStreak >= config.stopStreak || speedEma < 1.2 ? 0 : clamp(speedEma, 0, 320);

  const metrics: TrackingMetrics = {
    distanceM,
    speedKmh,
    maxSpeedKmh: Math.max(state.metrics.maxSpeedKmh, speedKmh),
    pointsAccepted: state.metrics.pointsAccepted + 1,
    warmupLocked: false
  };

  const nextState: GpsFilterState = {
    startedAt,
    warmupGood,
    lastFix: fix,
    speedEma,
    stationaryStreak,
    metrics
  };

  return {
    state: nextState,
    metrics: { ...metrics },
    acceptedForMetrics: canAccumulateDistance,
    rejectedByAccuracy: !accOk,
    rejectedByTeleport: isTeleport
  };
}

function calculateRawKmh(params: {
  fix: GpsFix;
  previous: GpsFix | null;
  accOk: boolean;
  isTeleport: boolean;
  dt: number;
  step: number;
}): number {
  const { fix, previous, accOk, isTeleport, dt, step } = params;
  if (!accOk || !previous || isTeleport) {
    return 0;
  }

  if (typeof fix.speedMs === "number" && !Number.isNaN(fix.speedMs)) {
    return fix.speedMs * 3.6;
  }

  return (step / dt) * 3.6;
}

export class GpsFilterEngine {
  private config: GpsFilterConfig;
  private state: GpsFilterState;

  constructor(config: GpsFilterConfig = defaultGpsFilterConfig) {
    this.config = gpsFilterConfigSchema.parse(config);
    this.state = createGpsFilterState();
  }

  start(timestamp = Date.now()): void {
    this.state = createGpsFilterState(timestamp);
  }

  ingest(fix: GpsFix): TrackingMetrics {
    const result = ingestGpsFix(this.state, fix, this.config);
    this.state = result.state;
    return result.metrics;
  }
}

export type { GpsFix, GpsFilterConfig };
