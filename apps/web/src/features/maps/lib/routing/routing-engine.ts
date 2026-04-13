import {
  isCanaryEnabled,
  parseAllowlist,
  parsePercent
} from "./rollout-targeting";

export type Coordinate = [number, number];

export interface Waypoint {
  lng: number;
  lat: number;
}

export interface TracePoint {
  lng: number;
  lat: number;
  timestamp: number;
  accuracyM?: number | null;
  speedMs?: number | null;
  altitudeM?: number | null;
}

export interface RouteResult {
  route: Coordinate[];
  distance?: number;
  duration?: number;
  provider: "mapbox-directions" | "osrm" | "direct";
  isFallback: boolean;
  reason?: string;
}

export interface MapMatchResult {
  points: TracePoint[];
  provider: "mapbox-map-matching" | "none";
  isFallback: boolean;
  reason?: string;
}

interface RoutingConfig {
  mapboxToken: string;
  directionsEnabled: boolean;
  mapMatchingEnabled: boolean;
  directionsCanaryAllowlist?: ReadonlySet<string>;
  directionsCanaryPercent?: number;
  mapMatchingCanaryAllowlist?: ReadonlySet<string>;
  mapMatchingCanaryPercent?: number;
  canarySalt?: string;
  timeoutMs: number;
}

interface RoutingRequestOptions {
  rolloutKey?: string | null;
}

interface RoutingEngineDependencies {
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 4500;

export function resolveRoutingConfigFromEnv(): RoutingConfig {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  return {
    mapboxToken,
    directionsEnabled: process.env.MAPBOX_DIRECTIONS_ENABLED !== "false",
    mapMatchingEnabled: process.env.MAPBOX_MAP_MATCHING_ENABLED === "true",
    directionsCanaryAllowlist: parseAllowlist(process.env.MAPBOX_DIRECTIONS_CANARY_ALLOWLIST),
    directionsCanaryPercent: parsePercent(process.env.MAPBOX_DIRECTIONS_CANARY_PERCENT),
    mapMatchingCanaryAllowlist: parseAllowlist(process.env.MAPBOX_MAP_MATCHING_CANARY_ALLOWLIST),
    mapMatchingCanaryPercent: parsePercent(process.env.MAPBOX_MAP_MATCHING_CANARY_PERCENT),
    canarySalt: process.env.ROUTING_CANARY_SALT,
    timeoutMs: Number(process.env.ROUTING_PROVIDER_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  };
}

export function createRoutingEngine(
  config: RoutingConfig = resolveRoutingConfigFromEnv(),
  deps: RoutingEngineDependencies = {}
) {
  const fetchImpl = deps.fetchImpl ?? fetch;

  async function getIdealRoute(waypoints: Waypoint[], options: RoutingRequestOptions = {}): Promise<RouteResult> {
    const safeWaypoints = sanitizeWaypoints(waypoints);
    if (safeWaypoints.length < 2) {
      return {
        route: safeWaypoints.map((point) => [point.lng, point.lat]),
        provider: "direct",
        isFallback: true,
        reason: "insufficient-waypoints"
      };
    }

    let directionsSkipReason: string | undefined;
    const directionsCanaryEnabled = isCanaryEnabled({
      baseEnabled: config.directionsEnabled,
      allowlist: config.directionsCanaryAllowlist,
      percent: config.directionsCanaryPercent,
      key: options.rolloutKey,
      salt: config.canarySalt
    });

    if (!directionsCanaryEnabled) {
      directionsSkipReason = "directions-canary-disabled";
    }

    if (directionsCanaryEnabled && config.mapboxToken) {
      const mapboxResult = await requestMapboxDirections(safeWaypoints, config, fetchImpl);
      if (mapboxResult) {
        return mapboxResult;
      }
    }

    const osrmResult = await requestOsrmDirections(safeWaypoints, config, fetchImpl);
    if (osrmResult) {
      if (directionsSkipReason) {
        return {
          ...osrmResult,
          reason: directionsSkipReason
        };
      }
      return osrmResult;
    }

    return {
      route: safeWaypoints.map((point) => [point.lng, point.lat]),
      provider: "direct",
      isFallback: true,
      reason: directionsSkipReason ?? "providers-unavailable"
    };
  }

  async function matchTrace(rawPoints: TracePoint[], options: RoutingRequestOptions = {}): Promise<MapMatchResult> {
    const points = sanitizeTracePoints(rawPoints);

    if (!config.mapMatchingEnabled) {
      return {
        points,
        provider: "none",
        isFallback: true,
        reason: "map-matching-disabled"
      };
    }

    if (!config.mapboxToken) {
      return {
        points,
        provider: "none",
        isFallback: true,
        reason: "missing-mapbox-token"
      };
    }

    const mapMatchingCanaryEnabled = isCanaryEnabled({
      baseEnabled: config.mapMatchingEnabled,
      allowlist: config.mapMatchingCanaryAllowlist,
      percent: config.mapMatchingCanaryPercent,
      key: options.rolloutKey,
      salt: config.canarySalt
    });

    if (!mapMatchingCanaryEnabled) {
      return {
        points,
        provider: "none",
        isFallback: true,
        reason: "map-matching-canary-disabled"
      };
    }

    if (points.length < 2) {
      return {
        points,
        provider: "none",
        isFallback: true,
        reason: "insufficient-points"
      };
    }

    if (points.length > 100) {
      // TODO(apex-ride): chunk traces >100 points and stitch output to increase coverage safely.
      return {
        points,
        provider: "none",
        isFallback: true,
        reason: "too-many-points-for-single-request"
      };
    }

    try {
      const coords = points.map((point) => `${point.lng},${point.lat}`).join(";");
      const radiuses = points
        .map((point) => {
          if (typeof point.accuracyM === "number" && Number.isFinite(point.accuracyM)) {
            return String(Math.max(5, Math.min(50, Math.round(point.accuracyM))));
          }
          return "unlimited";
        })
        .join(";");
      const timestamps = points.map((point) => Math.floor(point.timestamp / 1000)).join(";");

      const url =
        `https://api.mapbox.com/matching/v5/mapbox/cycling/${coords}` +
        `?geometries=geojson&overview=full&steps=false&tidy=true` +
        `&radiuses=${radiuses}&timestamps=${timestamps}&access_token=${config.mapboxToken}`;

      const response = await fetchWithTimeout(fetchImpl, url, {
        headers: { "User-Agent": "ApexRide/1.0" }
      }, config.timeoutMs);

      if (!response.ok) {
        return {
          points,
          provider: "none",
          isFallback: true,
          reason: `mapbox-map-matching-http-${response.status}`
        };
      }

      const data = (await response.json()) as {
        code?: string;
        tracepoints?: Array<{ location?: [number, number] } | null>;
      };

      if (data.code !== "Ok" || !Array.isArray(data.tracepoints) || data.tracepoints.length !== points.length) {
        return {
          points,
          provider: "none",
          isFallback: true,
          reason: data.code ? `mapbox-map-matching-${data.code.toLowerCase()}` : "invalid-map-matching-response"
        };
      }

      const snappedPoints = points.map((point, index) => {
        const tracepoint = data.tracepoints?.[index];
        const snapped = tracepoint?.location;
        if (!snapped || snapped.length !== 2) {
          return point;
        }

        return {
          ...point,
          lng: snapped[0],
          lat: snapped[1]
        };
      });

      return {
        points: snappedPoints,
        provider: "mapbox-map-matching",
        isFallback: false
      };
    } catch {
      return {
        points,
        provider: "none",
        isFallback: true,
        reason: "map-matching-request-failed"
      };
    }
  }

  return {
    getIdealRoute,
    matchTrace
  };
}

async function requestMapboxDirections(
  waypoints: Waypoint[],
  config: RoutingConfig,
  fetchImpl: typeof fetch
): Promise<RouteResult | null> {
  try {
    const coords = waypoints.map((point) => `${point.lng},${point.lat}`).join(";");
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/cycling/${coords}` +
      `?overview=full&geometries=geojson&steps=false&alternatives=false` +
      `&access_token=${config.mapboxToken}`;

    const response = await fetchWithTimeout(fetchImpl, url, {
      headers: { "User-Agent": "ApexRide/1.0" }
    }, config.timeoutMs);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      code?: string;
      routes?: Array<{ geometry?: { coordinates?: Coordinate[] }; distance?: number; duration?: number }>;
    };

    const route = data.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (data.code !== "Ok" || !coordinates || coordinates.length < 2) {
      return null;
    }

    return {
      route: coordinates,
      distance: route.distance,
      duration: route.duration,
      provider: "mapbox-directions",
      isFallback: false
    };
  } catch {
    return null;
  }
}

async function requestOsrmDirections(
  waypoints: Waypoint[],
  config: RoutingConfig,
  fetchImpl: typeof fetch
): Promise<RouteResult | null> {
  try {
    const coords = waypoints.map((point) => `${point.lng},${point.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const response = await fetchWithTimeout(fetchImpl, url, {
      headers: { "User-Agent": "ApexRide/1.0" }
    }, config.timeoutMs);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      code?: string;
      routes?: Array<{ geometry?: { coordinates?: Coordinate[] }; distance?: number; duration?: number }>;
    };

    const route = data.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (data.code !== "Ok" || !coordinates || coordinates.length < 2) {
      return null;
    }

    return {
      route: coordinates,
      distance: route.distance,
      duration: route.duration,
      provider: "osrm",
      isFallback: false
    };
  } catch {
    return null;
  }
}

function sanitizeWaypoints(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.filter((point) => isFiniteCoordinate(point.lng, point.lat));
}

function sanitizeTracePoints(points: TracePoint[]): TracePoint[] {
  return points.filter((point) => isFiniteCoordinate(point.lng, point.lat) && Number.isFinite(point.timestamp));
}

function isFiniteCoordinate(lng: number, lat: number): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
