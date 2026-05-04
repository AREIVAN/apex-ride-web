// Routing feature exports
export { DestinationSearchBox } from "./components/destination-search-box";
export { PlannedRouteSummary, PlannedRouteSummaryInline } from "./components/planned-route-summary";
export { searchPlaces, isGeocodingAvailable } from "./services/mapbox-geocoding-service";
export { calculateRoute, createPlannedRoute, recalculateRoute, isDirectionsAvailable } from "./services/mapbox-directions-service";
export {
  calculateDistanceM,
  findClosestPointOnRoute,
  calculateRemainingDistance,
  estimateRemainingTime,
  isOffRoute,
  createOffRouteState,
  updateOffRouteState,
  formatRouteDistance,
  formatRouteDuration,
  getShortDestinationName,
} from "./lib/planned-route-utils";
export type {
  PlannedRoute,
  PlannedRouteDestination,
  GeocodingResult,
  DirectionsResponse,
  RouteProfile,
  RouteCalculationStatus,
  RouteCalculationState,
  OffRouteState,
} from "./types/planned-route";