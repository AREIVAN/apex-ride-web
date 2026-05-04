/**
 * Mapbox Directions Service
 * Calculates routes between two points using Mapbox Directions API
 */

import { getMapboxToken } from "@/features/maps/lib/map-config";
import type { DirectionsResponse, PlannedRoute, PlannedRouteDestination, RouteProfile } from "../types/planned-route";

const DIRECTIONS_API_URL = "https://api.mapbox.com/directions/v5/mapbox";

/**
 * Calculate a route between two points
 * @param origin - Origin coordinates [lng, lat]
 * @param destination - Destination coordinates [lng, lat]
 * @param profile - Route profile (default: driving)
 * @returns Directions response with geometry and metrics
 */
export async function calculateRoute(
  origin: [number, number],
  destination: [number, number],
  profile: RouteProfile = "driving"
): Promise<DirectionsResponse> {
  const token = getMapboxToken();

  if (!token) {
    return {
      geometry: [],
      distanceM: 0,
      durationSec: 0,
      error: "Mapbox token no disponible",
    };
  }

  const url = `${DIRECTIONS_API_URL}/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}`
    + `?geometries=geojson&access_token=${token}&language=es&overview=full`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Directions] API error:", response.status, errorText);
      return {
        geometry: [],
        distanceM: 0,
        durationSec: 0,
        error: `Error del servidor: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.code && data.code !== "Ok") {
      console.error("[Directions] API error code:", data.code, data.message);
      return {
        geometry: [],
        distanceM: 0,
        durationSec: 0,
        error: data.message || `Error: ${data.code}`,
      };
    }

    if (!data.routes || data.routes.length === 0) {
      return {
        geometry: [],
        distanceM: 0,
        durationSec: 0,
        error: "No se encontró una ruta",
      };
    }

    const route = data.routes[0];

    // Extract geometry coordinates (Mapbox returns [lng, lat])
    const geometry: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[0], coord[1]] as [number, number]
    );

    return {
      geometry,
      distanceM: route.distance,
      durationSec: route.duration,
    };
  } catch (error) {
    console.error("[Directions] Request failed:", error);
    return {
      geometry: [],
      distanceM: 0,
      durationSec: 0,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}

/**
 * Create a PlannedRoute from origin and destination
 * @param origin - Origin coordinates [lng, lat]
 * @param destination - Destination info
 * @param profile - Route profile
 * @returns PlannedRoute or null if calculation fails
 */
export async function createPlannedRoute(
  origin: [number, number],
  destination: PlannedRouteDestination,
  profile: RouteProfile = "driving"
): Promise<PlannedRoute | null> {
  const response = await calculateRoute(origin, destination.coordinate, profile);

  if (response.error || response.geometry.length === 0) {
    console.error("[Directions] Failed to create route:", response.error);
    return null;
  }

  return {
    destination,
    geometry: response.geometry,
    distanceM: response.distanceM,
    durationSec: response.durationSec,
    provider: "mapbox",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Recalculate route from current position to same destination
 * Used when user goes off-route
 * @param currentPosition - Current coordinates [lng, lat]
 * @param destination - Original destination
 * @param profile - Route profile
 * @returns New PlannedRoute or null
 */
export async function recalculateRoute(
  currentPosition: [number, number],
  destination: PlannedRouteDestination,
  profile: RouteProfile = "driving"
): Promise<PlannedRoute | null> {
  return createPlannedRoute(currentPosition, destination, profile);
}

/**
 * Check if Mapbox Directions is available
 */
export function isDirectionsAvailable(): boolean {
  const token = getMapboxToken();
  return Boolean(token);
}