import { clamp, haversineMeters } from "./geo-math";
import {
  segmentDefinitionSchema,
  trackPointSchema,
  type SegmentDefinition,
  type TrackPoint,
} from "./tracking-types";

export type SegmentLiveStatus = "idle" | "near_start" | "active" | "completed" | "abandoned" | "invalid";

export type SegmentLiveReason =
  | "off_route"
  | "gps_gap"
  | "wrong_direction"
  | "too_fast_completion";

export interface SegmentLiveSnapshot {
  status: SegmentLiveStatus;
  progressPct: number;
  distanceToRouteM: number;
  distanceToStartM: number;
  distanceToEndM: number;
  startedAt: number | null;
  completedAt: number | null;
  elapsedSec: number;
  reason: SegmentLiveReason | null;
  onRouteScore: number;
  projectedPoint: { lat: number; lng: number } | null;
  projectedSegmentIndex: number | null;
}

export interface SegmentLiveTrackerConfig {
  nearStartRadiusM: number;
  nearStartExitRadiusM: number;
  startGateRadiusM: number;
  startMinProgressPct: number;
  startEvidenceFixes: number;
  routeToleranceM: number;
  routeLeaveToleranceM: number;
  offRouteGraceMs: number;
  maxFixGapMs: number;
  maxBacktrackPct: number;
  minProgressDeltaPct: number;
  completionGateRadiusM: number;
  completionMinProgressPct: number;
  minCompletionDurationSec: number;
}

const DEFAULT_TRACKER_CONFIG: SegmentLiveTrackerConfig = {
  nearStartRadiusM: 85,
  nearStartExitRadiusM: 130,
  startGateRadiusM: 35,
  startMinProgressPct: 1.5,
  startEvidenceFixes: 2,
  routeToleranceM: 30,
  routeLeaveToleranceM: 55,
  offRouteGraceMs: 8_000,
  maxFixGapMs: 15_000,
  maxBacktrackPct: 7,
  minProgressDeltaPct: 0.2,
  completionGateRadiusM: 45,
  completionMinProgressPct: 96,
  minCompletionDurationSec: 8,
};

type ProjectedRelation = {
  distanceM: number;
  progressPct: number;
  projectedPoint: { lat: number; lng: number };
  projectedSegmentIndex: number;
};

type MutableState = {
  status: SegmentLiveStatus;
  reason: SegmentLiveReason | null;
  startedAt: number | null;
  completedAt: number | null;
  bestProgressPct: number;
  startEvidenceCount: number;
  offRouteSince: number | null;
  lastFixAt: number | null;
  snapshot: SegmentLiveSnapshot;
};

export class SegmentLiveTracker {
  private readonly segment: SegmentDefinition;

  private readonly config: SegmentLiveTrackerConfig;

  private readonly cumulativeRouteLengthsM: number[];

  private readonly totalRouteLengthM: number;

  private state: MutableState;

  constructor(rawSegment: SegmentDefinition, partialConfig: Partial<SegmentLiveTrackerConfig> = {}) {
    this.segment = segmentDefinitionSchema.parse(rawSegment);
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...partialConfig };
    this.cumulativeRouteLengthsM = buildCumulativeLengths(this.segment.route);
    this.totalRouteLengthM = this.cumulativeRouteLengthsM[this.cumulativeRouteLengthsM.length - 1] ?? 0;
    this.state = this.buildInitialState();
  }

  reset(): SegmentLiveSnapshot {
    this.state = this.buildInitialState();
    return this.state.snapshot;
  }

  getSnapshot(): SegmentLiveSnapshot {
    return this.state.snapshot;
  }

  ingest(rawPoint: TrackPoint): SegmentLiveSnapshot {
    const point = trackPointSchema.parse(rawPoint);

    if (this.totalRouteLengthM <= 0) {
      this.state = this.applySnapshot({
        ...this.state,
        status: "invalid",
        reason: "too_fast_completion",
      }, point, {
        distanceM: Number.POSITIVE_INFINITY,
        progressPct: 0,
        projectedPoint: this.segment.start,
        projectedSegmentIndex: 0,
      });
      return this.state.snapshot;
    }

    const relation = projectPointToPolyline(point, this.segment.route, this.cumulativeRouteLengthsM, this.totalRouteLengthM);
    const distanceToStartM = haversineMeters(point, this.segment.start);
    const distanceToEndM = haversineMeters(point, this.segment.end);
    const onRouteScore = this.toOnRouteScore(relation.distanceM);
    const lastFixAt = this.state.lastFixAt;

    if (this.isTerminal(this.state.status)) {
      this.state = this.applySnapshot(this.state, point, relation, {
        distanceToStartM,
        distanceToEndM,
        onRouteScore,
      });
      return this.state.snapshot;
    }

    let next: MutableState = { ...this.state, lastFixAt: point.timestamp };

    if (next.status === "active" && lastFixAt !== null && point.timestamp - lastFixAt > this.config.maxFixGapMs) {
      next = this.transitionTo(next, "abandoned", point.timestamp, "gps_gap");
      this.state = this.applySnapshot(next, point, relation, { distanceToStartM, distanceToEndM, onRouteScore });
      return this.state.snapshot;
    }

    if (next.status === "idle") {
      if (distanceToStartM <= this.config.nearStartRadiusM && onRouteScore >= 0.3) {
        next = { ...next, status: "near_start", startEvidenceCount: 0 };
      }
      this.state = this.applySnapshot(next, point, relation, { distanceToStartM, distanceToEndM, onRouteScore });
      return this.state.snapshot;
    }

    if (next.status === "near_start") {
      if (distanceToStartM > this.config.nearStartExitRadiusM && relation.progressPct < this.config.startMinProgressPct) {
        next = { ...next, status: "idle", startEvidenceCount: 0 };
      } else {
        const hasStartEvidence =
          distanceToStartM <= this.config.startGateRadiusM &&
          relation.distanceM <= this.config.routeToleranceM &&
          relation.progressPct >= this.config.startMinProgressPct;

        next = {
          ...next,
          startEvidenceCount: hasStartEvidence
            ? next.startEvidenceCount + 1
            : Math.max(0, next.startEvidenceCount - 1),
        };

        if (next.startEvidenceCount >= this.config.startEvidenceFixes) {
          next = {
            ...next,
            status: "active",
            startedAt: point.timestamp,
            bestProgressPct: relation.progressPct,
            startEvidenceCount: this.config.startEvidenceFixes,
            reason: null,
            offRouteSince: null,
          };
        }
      }

      this.state = this.applySnapshot(next, point, relation, { distanceToStartM, distanceToEndM, onRouteScore });
      return this.state.snapshot;
    }

    if (next.status === "active") {
      const hasStrongBacktrack = relation.progressPct + this.config.maxBacktrackPct < next.bestProgressPct;
      if (hasStrongBacktrack) {
        next = this.transitionTo(next, "abandoned", point.timestamp, "wrong_direction");
        this.state = this.applySnapshot(next, point, relation, { distanceToStartM, distanceToEndM, onRouteScore });
        return this.state.snapshot;
      }

      if (relation.distanceM > this.config.routeLeaveToleranceM) {
        next = {
          ...next,
          offRouteSince: next.offRouteSince ?? point.timestamp,
        };
      } else {
        next = { ...next, offRouteSince: null };
      }

      if (next.offRouteSince !== null && point.timestamp - next.offRouteSince >= this.config.offRouteGraceMs) {
        next = this.transitionTo(next, "abandoned", point.timestamp, "off_route");
        this.state = this.applySnapshot(next, point, relation, { distanceToStartM, distanceToEndM, onRouteScore });
        return this.state.snapshot;
      }

      next = { ...next, bestProgressPct: Math.max(next.bestProgressPct, relation.progressPct) };

      const elapsedSec = this.getElapsedSec(next.startedAt, point.timestamp);
      const reachesFinishGate =
        distanceToEndM <= this.config.completionGateRadiusM &&
        next.bestProgressPct >= this.config.completionMinProgressPct;

      if (reachesFinishGate) {
        if (elapsedSec < this.config.minCompletionDurationSec) {
          next = this.transitionTo(next, "invalid", point.timestamp, "too_fast_completion");
        } else {
          next = this.transitionTo(next, "completed", point.timestamp, null);
        }
      }

      this.state = this.applySnapshot(next, point, relation, { distanceToStartM, distanceToEndM, onRouteScore });
      return this.state.snapshot;
    }

    this.state = this.applySnapshot(next, point, relation, { distanceToStartM, distanceToEndM, onRouteScore });
    return this.state.snapshot;
  }

  private buildInitialState(): MutableState {
    return {
      status: "idle",
      reason: null,
      startedAt: null,
      completedAt: null,
      bestProgressPct: 0,
      startEvidenceCount: 0,
      offRouteSince: null,
      lastFixAt: null,
      snapshot: {
        status: "idle",
        progressPct: 0,
        distanceToRouteM: Number.POSITIVE_INFINITY,
        distanceToStartM: Number.POSITIVE_INFINITY,
        distanceToEndM: Number.POSITIVE_INFINITY,
        startedAt: null,
        completedAt: null,
        elapsedSec: 0,
        reason: null,
        onRouteScore: 0,
        projectedPoint: null,
        projectedSegmentIndex: null,
      },
    };
  }

  private isTerminal(status: SegmentLiveStatus): boolean {
    return status === "completed" || status === "abandoned" || status === "invalid";
  }

  private transitionTo(
    state: MutableState,
    status: "completed" | "abandoned" | "invalid",
    at: number,
    reason: SegmentLiveReason | null
  ): MutableState {
    return {
      ...state,
      status,
      reason,
      completedAt: status === "completed" ? at : state.completedAt,
      offRouteSince: null,
    };
  }

  private toOnRouteScore(distanceM: number): number {
    return clamp(1 - distanceM / this.config.routeLeaveToleranceM, 0, 1);
  }

  private getElapsedSec(startedAt: number | null, now: number): number {
    if (startedAt === null) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1000));
  }

  private applySnapshot(
    state: MutableState,
    point: TrackPoint,
    relation: ProjectedRelation,
    explicit?: {
      distanceToStartM?: number;
      distanceToEndM?: number;
      onRouteScore?: number;
    }
  ): MutableState {
    const distanceToStartM = explicit?.distanceToStartM ?? haversineMeters(point, this.segment.start);
    const distanceToEndM = explicit?.distanceToEndM ?? haversineMeters(point, this.segment.end);
    const onRouteScore = explicit?.onRouteScore ?? this.toOnRouteScore(relation.distanceM);

    let progressPct = clamp(relation.progressPct, 0, 100);
    if (state.status === "active") {
      progressPct = clamp(Math.max(state.bestProgressPct, relation.progressPct), 0, 100);
    }
    if (this.isTerminal(state.status)) {
      progressPct = clamp(state.bestProgressPct, 0, 100);
    }

    const elapsedReference = state.completedAt ?? point.timestamp;
    const elapsedSec = this.getElapsedSec(state.startedAt, elapsedReference);

    return {
      ...state,
      lastFixAt: point.timestamp,
      snapshot: {
        status: state.status,
        progressPct,
        distanceToRouteM: relation.distanceM,
        distanceToStartM,
        distanceToEndM,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        elapsedSec,
        reason: state.reason,
        onRouteScore,
        projectedPoint: relation.projectedPoint,
        projectedSegmentIndex: relation.projectedSegmentIndex,
      },
    };
  }
}

function buildCumulativeLengths(route: SegmentDefinition["route"]): number[] {
  const lengths: number[] = [0];

  for (let index = 0; index < route.length - 1; index += 1) {
    const from = route[index];
    const to = route[index + 1];
    const previous = lengths[lengths.length - 1] ?? 0;
    lengths.push(previous + haversineMeters(from, to));
  }

  return lengths;
}

function projectPointToPolyline(
  point: { lat: number; lng: number },
  route: SegmentDefinition["route"],
  cumulativeRouteLengthsM: number[],
  totalRouteLengthM: number
): ProjectedRelation {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestProjectedPoint = route[0];
  let bestSegmentIndex = 0;
  let bestT = 0;

  for (let index = 0; index < route.length - 1; index += 1) {
    const projected = projectPointToSegment(point, route[index], route[index + 1]);
    if (projected.distanceM < bestDistance) {
      bestDistance = projected.distanceM;
      bestProjectedPoint = projected.projectedPoint;
      bestSegmentIndex = index;
      bestT = projected.t;
    }
  }

  const segmentLengthM =
    (cumulativeRouteLengthsM[bestSegmentIndex + 1] ?? 0) -
    (cumulativeRouteLengthsM[bestSegmentIndex] ?? 0);
  const traveledM = (cumulativeRouteLengthsM[bestSegmentIndex] ?? 0) + segmentLengthM * bestT;

  return {
    distanceM: bestDistance,
    progressPct: totalRouteLengthM > 0 ? clamp((traveledM / totalRouteLengthM) * 100, 0, 100) : 0,
    projectedPoint: bestProjectedPoint,
    projectedSegmentIndex: bestSegmentIndex,
  };
}

function projectPointToSegment(
  point: { lat: number; lng: number },
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): { distanceM: number; projectedPoint: { lat: number; lng: number }; t: number } {
  const latitude = ((point.lat + from.lat + to.lat) / 3) * (Math.PI / 180);
  const metersX = (lng: number) => 6_371_000 * ((lng * Math.PI) / 180) * Math.cos(latitude);
  const metersY = (lat: number) => 6_371_000 * ((lat * Math.PI) / 180);

  const px = metersX(point.lng);
  const py = metersY(point.lat);
  const ax = metersX(from.lng);
  const ay = metersY(from.lat);
  const bx = metersX(to.lng);
  const by = metersY(to.lat);

  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : clamp(((px - ax) * abx + (py - ay) * aby) / ab2, 0, 1);
  const projectedX = ax + abx * t;
  const projectedY = ay + aby * t;

  const distanceM = Math.hypot(px - projectedX, py - projectedY);
  const projectedPoint = {
    lng: (projectedX / (6_371_000 * Math.cos(latitude))) * (180 / Math.PI),
    lat: (projectedY / 6_371_000) * (180 / Math.PI),
  };

  return { distanceM, projectedPoint, t };
}
