export type RideStatus = "draft" | "recording" | "completed";

export interface Ride {
  id: string;
  riderId: string;
  title: string;
  status: RideStatus;
  startedAt: string;
  endedAt: string | null;
  distanceKm: number;
  elevationGainM: number;
  movingTimeSec: number;
}

export interface RidePoint {
  id: string;
  rideId: string;
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  speedKmh: number | null;
  capturedAt: string;
}
