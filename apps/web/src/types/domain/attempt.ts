export type SegmentAttemptStatus = "completed" | "abandoned" | "invalid";

export interface SegmentAttemptMetadata {
  source: "live" | "post_ride";
  onRouteRatio?: number;
  onRouteScore?: number;
  estimatedRank?: number;
  isPersonalBest?: boolean;
}

export interface SegmentAttempt {
  id: string;
  segmentId: string;
  syncKey: string;
  rideId: string;
  riderId: string;
  status: SegmentAttemptStatus;
  startedAt: string;
  completedAt: string | null;
  elapsedSec: number | null;
  progressFinal: number;
  distanceInSegmentM?: number | null;
  reason: string | null;
  metadata?: SegmentAttemptMetadata;
  recordedAt: string;
  syncState?: "pending" | "synced" | "failed";
  syncUpdatedAt?: string;
  lastSyncError?: string | null;
}

export interface SegmentLeaderboardEntry {
  rank: number;
  segmentId: string;
  riderId: string;
  attemptId: string;
  elapsedTimeSec: number;
  recordedAt: string;
  isCurrentAttempt: boolean;
}

export interface LeaderboardRow {
  rank: number;
  riderId: string;
  riderName: string;
  segmentId: string;
  elapsedTimeSec: number;
  recordedAt: string;
  isCurrentAttempt?: boolean;
  isLocalPersonalBest?: boolean;
  isPendingSync?: boolean;
}
