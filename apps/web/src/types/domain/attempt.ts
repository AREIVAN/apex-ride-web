export interface SegmentAttempt {
  id: string;
  segmentId: string;
  rideId: string;
  riderId: string;
  elapsedTimeSec: number;
  avgPowerW: number | null;
  avgHeartRate: number | null;
  recordedAt: string;
}

export interface LeaderboardRow {
  rank: number;
  riderId: string;
  riderName: string;
  segmentId: string;
  elapsedTimeSec: number;
  recordedAt: string;
}
