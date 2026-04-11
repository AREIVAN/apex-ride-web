import { distancePointToPolylineMeters, haversineMeters } from "./geo-math";
import {
  attemptDetectorConfigSchema,
  segmentDefinitionSchema,
  trackPointSchema,
  type AttemptDetectorConfig,
  type SegmentDefinition,
  type TrackPoint
} from "./tracking-types";

export interface SegmentAttemptCandidate {
  segmentId: string;
  elapsedTimeSec: number;
  onRouteRatio: number;
  startedAt: number;
  endedAt: number;
}

export const defaultAttemptConfig: AttemptDetectorConfig = {
  minOnRouteRatio: 0.7,
  minGateRadiusM: 35,
  minRouteToleranceM: 20,
  maxRouteToleranceM: 65,
  routeToleranceMultiplier: 1.5,
  minElapsedSec: 8
};

export function detectSegmentAttempts(
  rawPoints: TrackPoint[],
  rawSegments: SegmentDefinition[],
  rawConfig: AttemptDetectorConfig = defaultAttemptConfig
): SegmentAttemptCandidate[] {
  const points = rawPoints.map((point) => trackPointSchema.parse(point));
  const segments = rawSegments.map((segment) => segmentDefinitionSchema.parse(segment));
  const config = attemptDetectorConfigSchema.parse(rawConfig);

  if (points.length < 2 || !segments.length) {
    return [];
  }

  const candidates: SegmentAttemptCandidate[] = [];

  for (const segment of segments) {
    const gateRadius = Math.max(config.minGateRadiusM, segment.radiusM ?? config.minGateRadiusM);
    const routeTolerance = clampRouteTolerance({
      gateRadius,
      min: config.minRouteToleranceM,
      max: config.maxRouteToleranceM,
      multiplier: config.routeToleranceMultiplier
    });

    const startIndex = findFirstNearGate(points, segment.start, 0, gateRadius);
    if (startIndex < 0) {
      continue;
    }

    const endIndex = findFirstNearGate(points, segment.end, startIndex + 1, gateRadius);
    if (endIndex < 0) {
      continue;
    }

    const window = points.slice(startIndex, endIndex + 1);
    const onRouteCount = window.filter(
      (point) => distancePointToPolylineMeters(point, segment.route) <= routeTolerance
    ).length;

    const onRouteRatio = onRouteCount / Math.max(1, window.length);
    if (onRouteRatio < config.minOnRouteRatio) {
      continue;
    }

    const startedAt = points[startIndex].timestamp;
    const endedAt = points[endIndex].timestamp;
    const elapsedTimeSec = Math.max(1, Math.round((endedAt - startedAt) / 1000));

    if (elapsedTimeSec < config.minElapsedSec) {
      continue;
    }

    candidates.push({
      segmentId: segment.id,
      elapsedTimeSec,
      onRouteRatio,
      startedAt,
      endedAt
    });
  }

  return candidates;
}

function findFirstNearGate(points: TrackPoint[], gate: SegmentDefinition["start"], fromIndex: number, radiusM: number): number {
  for (let index = fromIndex; index < points.length; index += 1) {
    if (haversineMeters(points[index], gate) <= radiusM) {
      return index;
    }
  }

  return -1;
}

function clampRouteTolerance(params: { gateRadius: number; min: number; max: number; multiplier: number }): number {
  const { gateRadius, min, max, multiplier } = params;
  const candidate = gateRadius * multiplier;
  return Math.max(min, Math.min(max, candidate));
}

export type { SegmentDefinition, TrackPoint, AttemptDetectorConfig };
