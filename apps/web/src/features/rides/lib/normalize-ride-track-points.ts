export type NormalizedTrackPoint = {
  lat: number;
  lng: number;
  timestamp?: string | number | Date;
  speed?: number;
  accuracy?: number;
  altitude?: number;
};

const TRACK_COLLECTION_KEYS = [
  "gpsPoints",
  "points",
  "trackPoints",
  "routePoints",
  "samples",
  "coordinates",
  "path",
  "trace",
  "locations",
  "telemetry",
  "ride_points",
  "ridePoints",
  "recordedPoints",
] as const;

export function normalizeRideTrackPoints(input: unknown): NormalizedTrackPoint[] {
  const candidates = collectPointCandidates(input);
  const normalized = candidates
    .map((candidate) => normalizeTrackPoint(candidate))
    .filter((point): point is NormalizedTrackPoint => point !== null);

  return removeConsecutiveDuplicates(normalized);
}

function collectPointCandidates(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    if (isCoordinateTuple(input)) return [input];
    return input.flatMap((item) => collectPointCandidates(item));
  }

  if (!input || typeof input !== "object") return [input];

  const source = input as Record<string, unknown>;

  for (const key of TRACK_COLLECTION_KEYS) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      return collectPointCandidates(value);
    }
  }

  return [input];
}

function normalizeTrackPoint(input: unknown): NormalizedTrackPoint | null {
  const pair = parseCoordinatePair(input);
  if (!pair) return null;

  const meta = input && typeof input === "object" ? extractMetadata(input as Record<string, unknown>) : {};
  return { lat: pair.lat, lng: pair.lng, ...meta };
}

function parseCoordinatePair(input: unknown): { lat: number; lng: number } | null {
  if (Array.isArray(input)) return parseCoordinateTuple(input);

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return parseCoordinatePair(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }

    return parseWktPoint(trimmed) ?? parseEwkbPoint(trimmed);
  }

  if (!input || typeof input !== "object") return null;

  const point = input as Record<string, unknown>;

  if (point.location !== undefined) {
    const fromLocation = parseCoordinatePair(point.location);
    if (fromLocation) return fromLocation;
  }

  if (point.coords && typeof point.coords === "object") {
    const fromCoords = parseLatLngObject(point.coords as Record<string, unknown>);
    if (fromCoords) return fromCoords;
  }

  if (point.position && typeof point.position === "object") {
    const fromPosition = parseLatLngObject(point.position as Record<string, unknown>);
    if (fromPosition) return fromPosition;
  }

  if (Array.isArray(point.coordinates)) {
    const fromCoordinates = parseCoordinateTuple(point.coordinates);
    if (fromCoordinates) return fromCoordinates;
  }

  return parseLatLngObject(point);
}

function parseLatLngObject(point: Record<string, unknown>): { lat: number; lng: number } | null {
  const lat = toFiniteNumber(point.latitude ?? point.lat);
  const lng = toFiniteNumber(point.longitude ?? point.lng ?? point.lon);

  return isValidCoordinate(lng, lat) ? { lat, lng } : null;
}

function parseCoordinateTuple(tuple: unknown[]): { lat: number; lng: number } | null {
  if (tuple.length < 2) return null;

  const first = toFiniteNumber(tuple[0]);
  const second = toFiniteNumber(tuple[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  if (isValidLatitude(first) && Math.abs(second) > 90 && isValidLongitude(second)) {
    return { lat: first, lng: second };
  }

  return isValidCoordinate(first, second) ? { lng: first, lat: second } : null;
}

function parseWktPoint(value: string): { lat: number; lng: number } | null {
  const normalized = value.replace(/^SRID=\d+;/i, "");
  const match = normalized.match(/POINT\s*(?:Z|M|ZM)?\s*\(([^)]+)\)/i);
  if (!match) return null;

  const [lngRaw, latRaw] = match[1].trim().split(/\s+/);
  const lng = toFiniteNumber(lngRaw);
  const lat = toFiniteNumber(latRaw);

  return isValidCoordinate(lng, lat) ? { lat, lng } : null;
}

function parseEwkbPoint(value: string): { lat: number; lng: number } | null {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 42 || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = hexToBytes(hex);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  const littleEndianFlag = view.getUint8(offset);
  const littleEndian = littleEndianFlag === 1;
  if (!littleEndian && littleEndianFlag !== 0) return null;
  offset += 1;

  if (offset + 4 > view.byteLength) return null;
  const geometryType = view.getUint32(offset, littleEndian);
  offset += 4;

  const hasZ = (geometryType & 0x80000000) !== 0;
  const hasM = (geometryType & 0x40000000) !== 0;
  const hasSrid = (geometryType & 0x20000000) !== 0;
  const baseType = geometryType & 0x000000ff;
  if (baseType !== 1) return null;

  if (hasSrid) offset += 4;

  const dimensions = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);
  if (offset + dimensions * 8 > view.byteLength) return null;

  const lng = view.getFloat64(offset, littleEndian);
  const lat = view.getFloat64(offset + 8, littleEndian);

  return isValidCoordinate(lng, lat) ? { lat, lng } : null;
}

function extractMetadata(point: Record<string, unknown>): Omit<NormalizedTrackPoint, "lat" | "lng"> {
  const speed = toOptionalNumber(point.speed ?? point.speedKmh ?? point.speed_kmh);
  const accuracy = toOptionalNumber(point.accuracy ?? point.accuracyM ?? point.accuracy_m);
  const altitude = toOptionalNumber(point.altitude ?? point.altitudeM ?? point.altitude_m);
  const timestamp = point.timestamp ?? point.capturedAt ?? point.captured_at;

  return {
    ...(timestamp instanceof Date || typeof timestamp === "string" || typeof timestamp === "number" ? { timestamp } : {}),
    ...(speed !== undefined ? { speed } : {}),
    ...(accuracy !== undefined ? { accuracy } : {}),
    ...(altitude !== undefined ? { altitude } : {}),
  };
}

function removeConsecutiveDuplicates(points: NormalizedTrackPoint[]): NormalizedTrackPoint[] {
  return points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.lat !== point.lat || previous.lng !== point.lng;
  });
}

function isCoordinateTuple(value: unknown[]): boolean {
  return (
    value.length >= 2 &&
    !Array.isArray(value[0]) &&
    !isPlainObject(value[0]) &&
    Number.isFinite(toFiniteNumber(value[0])) &&
    Number.isFinite(toFiniteNumber(value[1]))
  );
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = toFiniteNumber(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isValidCoordinate(lng: number, lat: number): boolean {
  return isValidLongitude(lng) && isValidLatitude(lat);
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}
