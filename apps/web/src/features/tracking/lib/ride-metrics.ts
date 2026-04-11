import { haversineMeters } from "./geo-math";
import {
  rideMetricsConfigSchema,
  trackPointSchema,
  type RideMetricsConfig,
  type TrackPoint
} from "./tracking-types";

export interface RideMetrics {
  pointCount: number;
  distanceM: number;
  durationSec: number;
  movingTimeSec: number;
  avgSpeedKmh: number;
  movingAvgSpeedKmh: number;
  maxSpeedKmh: number;
  ascentM: number;
  descentM: number;
}

export const defaultRideMetricsConfig: RideMetricsConfig = {
  maxJumpM: 120,
  maxJumpDeltaS: 2,
  minMoveM: 2,
  movingSpeedKmhThreshold: 2,
  elevationNoiseFloorM: 1
};

export function computeRideMetrics(
  rawPoints: TrackPoint[],
  rawConfig: RideMetricsConfig = defaultRideMetricsConfig
): RideMetrics {
  const points = rawPoints.map((point) => trackPointSchema.parse(point));
  const config = rideMetricsConfigSchema.parse(rawConfig);

  if (points.length < 2) {
    return {
      pointCount: points.length,
      distanceM: 0,
      durationSec: 0,
      movingTimeSec: 0,
      avgSpeedKmh: 0,
      movingAvgSpeedKmh: 0,
      maxSpeedKmh: 0,
      ascentM: 0,
      descentM: 0
    };
  }

  let distanceM = 0;
  let movingTimeSec = 0;
  let maxSpeedKmh = 0;
  let ascentM = 0;
  let descentM = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    const dt = Math.max(0, (current.timestamp - previous.timestamp) / 1000);
    if (dt === 0) {
      continue;
    }

    const stepDistanceM = haversineMeters(previous, current);
    const isTeleport = stepDistanceM > config.maxJumpM && dt < config.maxJumpDeltaS;
    if (isTeleport) {
      continue;
    }

    if (stepDistanceM >= config.minMoveM) {
      distanceM += stepDistanceM;
    }

    const fallbackSpeedKmh = (stepDistanceM / dt) * 3.6;
    const measuredSpeedKmh =
      typeof current.speedMs === "number" && !Number.isNaN(current.speedMs)
        ? current.speedMs * 3.6
        : fallbackSpeedKmh;

    if (measuredSpeedKmh >= config.movingSpeedKmhThreshold || stepDistanceM >= config.minMoveM) {
      movingTimeSec += dt;
    }

    maxSpeedKmh = Math.max(maxSpeedKmh, measuredSpeedKmh);

    if (typeof previous.altitudeM === "number" && typeof current.altitudeM === "number") {
      const elevationDelta = current.altitudeM - previous.altitudeM;
      if (elevationDelta >= config.elevationNoiseFloorM) {
        ascentM += elevationDelta;
      } else if (elevationDelta <= -config.elevationNoiseFloorM) {
        descentM += Math.abs(elevationDelta);
      }
    }
  }

  const durationSec = Math.max(0, (points[points.length - 1].timestamp - points[0].timestamp) / 1000);
  const avgSpeedKmh = durationSec > 0 ? (distanceM / durationSec) * 3.6 : 0;
  const movingAvgSpeedKmh = movingTimeSec > 0 ? (distanceM / movingTimeSec) * 3.6 : 0;

  return {
    pointCount: points.length,
    distanceM,
    durationSec,
    movingTimeSec,
    avgSpeedKmh,
    movingAvgSpeedKmh,
    maxSpeedKmh,
    ascentM,
    descentM
  };
}
