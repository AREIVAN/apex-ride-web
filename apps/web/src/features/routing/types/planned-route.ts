/**
 * Planned Route - Types for planned route navigation
 * Used when a user selects a destination before starting a ride
 */

export interface PlannedRouteDestination {
  /** Place name */
  name: string;
  /** Full address or context */
  address?: string;
  /** Coordinates as [lng, lat] */
  coordinate: [number, number];
}

export interface PlannedRoute {
  /** Destination info */
  destination: PlannedRouteDestination;
  /** Route geometry as array of [lng, lat] coordinates */
  geometry: [number, number][];
  /** Total distance in meters */
  distanceM: number;
  /** Estimated duration in seconds */
  durationSec: number;
  /** Route provider */
  provider: "mapbox";
  /** When the route was created */
  createdAt: string;
}

export interface GeocodingResult {
  /** Display name */
  name: string;
  /** Full address or context */
  address: string;
  /** Coordinates as [lng, lat] */
  coordinate: [number, number];
  /** Optional: distance from reference point in meters */
  distanceM?: number;
  /** Place ID for potential future use */
  placeId?: string;
}

export interface DirectionsResponse {
  /** Geometry coordinates */
  geometry: [number, number][];
  /** Distance in meters */
  distanceM: number;
  /** Duration in seconds */
  durationSec: number;
  /** Error message if failed */
  error?: string;
}

/** Route profile options */
export type RouteProfile = "driving" | "driving-traffic" | "cycling" | "walking";

/** State for route calculation */
export type RouteCalculationStatus = "idle" | "calculating" | "success" | "error";

export interface RouteCalculationState {
  status: RouteCalculationStatus;
  route: PlannedRoute | null;
  error: string | null;
}

/** Off-route detection state */
export interface OffRouteState {
  isOffRoute: boolean;
  distanceToRouteM: number;
  checkCount: number;
}