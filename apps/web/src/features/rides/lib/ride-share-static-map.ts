import { getMapboxToken } from "@/features/maps/lib/map-config";

export type RideStaticMapCoordinate = [number, number];

export interface RideBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface BuildStaticMapUrlOptions {
  width?: number;
  height?: number;
  padding?: number;
  token?: string;
  maxUrlLength?: number;
  routeColor?: string;
  routeWidth?: number;
  routeOpacity?: number;
}

const MAPBOX_STATIC_BASE_URL = "https://api.mapbox.com/styles/v1/mapbox/dark-v11/static";
const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 460;
const DEFAULT_PADDING = 48;
const MAPBOX_MAX_URL_LENGTH = 8192;
const SAFE_MAX_URL_LENGTH = 7800;
const INITIAL_MAX_ROUTE_POINTS = 260;
const MIN_ROUTE_POINTS = 2;

export function getRideBounds(coordinates: RideStaticMapCoordinate[]): RideBounds | null {
  const validCoordinates = getValidCoordinates(coordinates);
  if (validCoordinates.length < MIN_ROUTE_POINTS) return null;

  const lngs = validCoordinates.map((coordinate) => coordinate[0]);
  const lats = validCoordinates.map((coordinate) => coordinate[1]);

  return {
    minLng: Math.min(...lngs),
    minLat: Math.min(...lats),
    maxLng: Math.max(...lngs),
    maxLat: Math.max(...lats)
  };
}

export function encodeRidePolyline(coordinates: RideStaticMapCoordinate[]): string {
  let previousLat = 0;
  let previousLng = 0;

  return getValidCoordinates(coordinates)
    .map(([lng, lat]) => {
      const nextLat = Math.round(lat * 1e5);
      const nextLng = Math.round(lng * 1e5);
      const encoded = encodeSignedValue(nextLat - previousLat) + encodeSignedValue(nextLng - previousLng);

      previousLat = nextLat;
      previousLng = nextLng;

      return encoded;
    })
    .join("");
}

export function buildStaticMapUrl(coordinates: RideStaticMapCoordinate[], options: BuildStaticMapUrlOptions = {}): string | null {
  const token = options.token ?? getMapboxToken();
  if (!token) return null;

  const validCoordinates = getValidCoordinates(coordinates);
  if (validCoordinates.length < MIN_ROUTE_POINTS) return null;

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const padding = options.padding ?? DEFAULT_PADDING;
  const maxUrlLength = Math.min(options.maxUrlLength ?? SAFE_MAX_URL_LENGTH, MAPBOX_MAX_URL_LENGTH);

  let maxPoints = Math.min(INITIAL_MAX_ROUTE_POINTS, validCoordinates.length);

  while (maxPoints >= MIN_ROUTE_POINTS) {
    const routeCoordinates = sampleRouteCoordinates(validCoordinates, maxPoints);
    const url = buildMapboxUrl(routeCoordinates, {
      width,
      height,
      padding,
      token,
      routeColor: options.routeColor ?? "2dd4bf",
      routeWidth: options.routeWidth ?? 6,
      routeOpacity: options.routeOpacity ?? 0.95,
    });

    if (url.length <= maxUrlLength) return url;
    if (maxPoints === MIN_ROUTE_POINTS) break;
    maxPoints = Math.max(MIN_ROUTE_POINTS, Math.floor(maxPoints * 0.65));
  }

  return null;
}

export function sampleRouteCoordinates(coordinates: RideStaticMapCoordinate[], maxPoints: number): RideStaticMapCoordinate[] {
  const validCoordinates = getValidCoordinates(coordinates);
  if (validCoordinates.length <= maxPoints) return validCoordinates;
  if (maxPoints < MIN_ROUTE_POINTS) return [];

  const lastIndex = validCoordinates.length - 1;
  const sampled: RideStaticMapCoordinate[] = [];

  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index * lastIndex) / (maxPoints - 1));
    const coordinate = validCoordinates[sourceIndex];
    if (!sampled.length || sampled[sampled.length - 1] !== coordinate) sampled.push(coordinate);
  }

  if (sampled[sampled.length - 1] !== validCoordinates[lastIndex]) sampled.push(validCoordinates[lastIndex]);
  return sampled;
}

function buildMapboxUrl(
  coordinates: RideStaticMapCoordinate[],
  options: Required<Pick<BuildStaticMapUrlOptions, "width" | "height" | "padding" | "token" | "routeColor" | "routeWidth" | "routeOpacity">>
): string {
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  const polyline = encodeURIComponent(encodeRidePolyline(coordinates));
  const routeColor = options.routeColor.replace(/^#/, "");
  const overlays = [
    `path-${options.routeWidth}+${routeColor}-${options.routeOpacity}(${polyline})`,
    `pin-s-a+10b981(${formatCoordinate(start[0])},${formatCoordinate(start[1])})`,
    `pin-s-b+fb7185(${formatCoordinate(end[0])},${formatCoordinate(end[1])})`
  ].join(",");
  const searchParams = new URLSearchParams({
    padding: String(options.padding),
    access_token: options.token
  });

  return `${MAPBOX_STATIC_BASE_URL}/${overlays}/auto/${options.width}x${options.height}?${searchParams.toString()}`;
}

function getValidCoordinates(coordinates: RideStaticMapCoordinate[]): RideStaticMapCoordinate[] {
  return coordinates.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -85.0511 && lat <= 85.0511);
}

function formatCoordinate(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function encodeSignedValue(value: number): string {
  let encodedValue = value < 0 ? ~(value << 1) : value << 1;
  let output = "";

  while (encodedValue >= 0x20) {
    output += String.fromCharCode((0x20 | (encodedValue & 0x1f)) + 63);
    encodedValue >>= 5;
  }

  return output + String.fromCharCode(encodedValue + 63);
}
