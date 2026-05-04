/**
 * Planned Route Utilities
 * Helper functions for route calculations, off-route detection, and remaining distance
 */

import type { PlannedRoute, OffRouteState } from "../types/planned-route";

/**
 * Validate if a coordinate is a valid [lng, lat] pair
 */
export function isValidLngLat(coordinate: unknown): coordinate is [number, number] {
  if (!Array.isArray(coordinate) || coordinate.length !== 2) return false;
  const [lng, lat] = coordinate;
  return (
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Resolve the origin coordinate for route calculation
 * Uses multiple sources in priority order:
 * 1. currentPosition (real GPS from recording)
 * 2. mapUserLocation (visual position from map's blue dot)
 * 3. Last point of liveRoute if exists
 * 4. First point of liveRoute if exists
 * @returns Valid [lng, lat] or null if no valid source
 */
export function resolveRouteOriginCoordinate(
  currentPosition: [number, number] | null | undefined,
  mapUserLocation: [number, number] | null | undefined,
  liveRoute: [number, number][]
): [number, number] | null {
  // 1. Use currentPosition if valid (real GPS from recording)
  if (isValidLngLat(currentPosition)) {
    return currentPosition;
  }

  // 2. Use map user location (visual position from map's blue dot)
  if (isValidLngLat(mapUserLocation)) {
    return mapUserLocation;
  }

  // 3. Use last point of live route (if recording has started)
  if (Array.isArray(liveRoute) && liveRoute.length > 0) {
    const lastPoint = liveRoute[liveRoute.length - 1];
    if (isValidLngLat(lastPoint)) {
      return lastPoint;
    }
  }

  // 4. Use first point of live route
  if (Array.isArray(liveRoute) && liveRoute.length > 0) {
    const firstPoint = liveRoute[0];
    if (isValidLngLat(firstPoint)) {
      return firstPoint;
    }
  }

  // No valid source
  return null;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 - [lng, lat]
 * @param coord2 - [lng, lat]
 * @returns Distance in meters
 */
export function calculateDistanceM(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const lat1 = toRad(coord1[1]);
  const lat2 = toRad(coord2[1]);
  const deltaLat = toRad(coord2[1] - coord1[1]);
  const deltaLng = toRad(coord2[0] - coord1[0]);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find the closest point on a route to a given position
 * @param position - Current position [lng, lat]
 * @param routeGeometry - Route coordinates
 * @returns Index of closest point and distance to it
 */
export function findClosestPointOnRoute(
  position: [number, number],
  routeGeometry: [number, number][]
): { index: number; distanceM: number } {
  if (routeGeometry.length === 0) {
    return { index: 0, distanceM: 0 };
  }

  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < routeGeometry.length; i++) {
    const distance = calculateDistanceM(position, routeGeometry[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return { index: closestIndex, distanceM: minDistance };
}

/**
 * Calculate remaining distance from current position to route end
 * @param currentPosition - Current position [lng, lat]
 * @param route - PlannedRoute
 * @returns Remaining distance in meters
 */
export function calculateRemainingDistance(
  currentPosition: [number, number],
  route: PlannedRoute
): number {
  const { index, distanceM: distToRoute } = findClosestPointOnRoute(
    currentPosition,
    route.geometry
  );

  // Calculate distance from closest point to end of route
  let remainingOnRoute = 0;
  for (let i = index; i < route.geometry.length - 1; i++) {
    remainingOnRoute += calculateDistanceM(route.geometry[i], route.geometry[i + 1]);
  }

  return distToRoute + remainingOnRoute;
}

/**
 * Estimate remaining time based on current speed
 * @param remainingDistanceM - Remaining distance in meters
 * @param currentSpeedKmh - Current speed in km/h
 * @returns Estimated remaining time in seconds
 */
export function estimateRemainingTime(
  remainingDistanceM: number,
  currentSpeedKmh: number
): number {
  if (currentSpeedKmh < 3) {
    // If moving very slowly or stopped, use average speed assumption
    return remainingDistanceM / 10; // Assume ~36 km/h average
  }
  return (remainingDistanceM / 1000) / (currentSpeedKmh / 3600);
}

/**
 * Check if user is off the planned route
 * @param currentPosition - Current position [lng, lat]
 * @param route - PlannedRoute
 * @param thresholdM - Distance threshold in meters (default 60m)
 * @returns true if off route
 */
export function isOffRoute(
  currentPosition: [number, number],
  route: PlannedRoute,
  thresholdM: number = 60
): boolean {
  const { distanceM } = findClosestPointOnRoute(currentPosition, route.geometry);
  return distanceM > thresholdM;
}

/**
 * Create initial off-route detection state
 */
export function createOffRouteState(): OffRouteState {
  return {
    isOffRoute: false,
    distanceToRouteM: 0,
    checkCount: 0,
  };
}

/**
 * Update off-route state based on new position check
 * Requires multiple consecutive checks to confirm off-route
 */
export function updateOffRouteState(
  currentState: OffRouteState,
  isCurrentlyOffRoute: boolean,
  distanceM: number
): OffRouteState {
  const CONFIRMATION_THRESHOLD = 3; // Need 3 consecutive off-route checks

  if (isCurrentlyOffRoute) {
    const newCheckCount = currentState.isOffRoute
      ? currentState.checkCount + 1
      : 1;

    return {
      isOffRoute: newCheckCount >= CONFIRMATION_THRESHOLD,
      distanceToRouteM: distanceM,
      checkCount: newCheckCount,
    };
  }

  // Reset if back on route
  return {
    isOffRoute: false,
    distanceToRouteM: distanceM,
    checkCount: 0,
  };
}

/**
 * Format distance for display
 * @param distanceM - Distance in meters
 * @returns Formatted string
 */
export function formatRouteDistance(distanceM: number): string {
  if (distanceM >= 1000) {
    return `${(distanceM / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distanceM)} m`;
}

/**
 * Format duration for display
 * @param durationSec - Duration in seconds
 * @returns Formatted string (e.g., "15 min", "1 h 30 min")
 */
export function formatRouteDuration(distanceSec: number): string {
  const totalMinutes = Math.round(distanceSec / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

/**
 * Get short destination name for display
 * Truncate if too long
 */
export function getShortDestinationName(destinationName: string, maxLength: number = 20): string {
  if (destinationName.length <= maxLength) {
    return destinationName;
  }
  return destinationName.substring(0, maxLength - 3) + "...";
}