import type { LeaderboardRow, Ride, RiderProfile, Segment, UserSettings } from "@/types/domain";
import type { Database } from "@/lib/supabase/database.types";

type RideRow = Database["public"]["Tables"]["rides"]["Row"];
type SegmentRow = Database["public"]["Tables"]["segments"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type LeaderboardViewRow = Database["public"]["Views"]["segment_leaderboard"]["Row"];
type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];

export function mapRideRow(row: RideRow): Ride {
  return {
    id: row.id,
    riderId: row.rider_id,
    title: row.title,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distanceKm: row.distance_km,
    elevationGainM: row.elevation_gain_m,
    movingTimeSec: row.moving_time_sec
  };
}

export function mapSegmentRow(row: SegmentRow): Segment {
  return {
    id: row.id,
    creatorId: row.creator_id,
    name: row.name,
    description: row.description,
    distanceM: row.distance_m,
    elevationGainM: row.elevation_gain_m,
    avgGradientPct: row.avg_gradient_pct,
    visibility: row.visibility,
    startLat: row.start_lat,
    startLng: row.start_lng,
    endLat: row.end_lat,
    endLng: row.end_lng,
    pathCoordinates: parseLineCoordinates(row.geom),
    createdAt: row.created_at
  };
}

export function parseLineCoordinates(geom: unknown): [number, number][] | undefined {
  if (!geom) return undefined;

  if (Array.isArray(geom)) {
    return parseCoordinateArray(geom);
  }

  if (typeof geom === "string") {
    const trimmed = geom.trim();

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return parseLineCoordinates(JSON.parse(trimmed));
      } catch {
        return undefined;
      }
    }

    const wktCoords = parseWktLineString(trimmed);
    if (wktCoords) return wktCoords;

    const ewkbCoords = parseEwkbLineString(trimmed);
    if (ewkbCoords) return ewkbCoords;

    return undefined;
  }

  if (typeof geom !== "object") return undefined;

  const geojsonCoords = parseGeoJsonCoordinates(geom);
  if (geojsonCoords) return geojsonCoords;

  const maybeGeo = geom as { coordinates?: unknown };
  return parseCoordinateArray(maybeGeo.coordinates);
}

function parseWktLineString(value: string): [number, number][] | undefined {
  const normalized = value.replace(/^SRID=\d+;/i, "");
  const wktMatch = normalized.match(/LINESTRING\s*(?:Z|M|ZM)?\s*\(([^)]+)\)/i);
  if (!wktMatch) return undefined;

  const coords = wktMatch[1]
    .split(",")
    .map((coordinate) => {
      const parts = coordinate.trim().split(/\s+/);
      if (parts.length < 2) return null;

      const lng = Number(parts[0]);
      const lat = Number(parts[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

      return [lng, lat] as [number, number];
    })
    .filter((coordinate): coordinate is [number, number] => coordinate !== null);

  return coords.length >= 2 ? coords : undefined;
}

function parseGeoJsonCoordinates(geom: unknown): [number, number][] | undefined {
  if (!geom || typeof geom !== "object") return undefined;

  const maybeGeo = geom as {
    type?: unknown;
    geometry?: unknown;
    coordinates?: unknown;
  };

  if (maybeGeo.type === "Feature" && maybeGeo.geometry) {
    return parseGeoJsonCoordinates(maybeGeo.geometry);
  }

  if (maybeGeo.type === "LineString" && maybeGeo.coordinates) {
    return parseCoordinateArray(maybeGeo.coordinates);
  }

  return undefined;
}

function parseCoordinateArray(coordinates: unknown): [number, number][] | undefined {
  if (!Array.isArray(coordinates)) return undefined;

  const parsed = coordinates
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
      const lng = Number(coordinate[0]);
      const lat = Number(coordinate[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      return [lng, lat] as [number, number];
    })
    .filter((coordinate): coordinate is [number, number] => Boolean(coordinate));

  return parsed.length >= 2 ? parsed : undefined;
}

function parseEwkbLineString(value: string): [number, number][] | undefined {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 18 || hex.length % 2 !== 0) {
    return undefined;
  }

  const bytes = hexToBytes(hex);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  const littleEndianFlag = view.getUint8(offset);
  const littleEndian = littleEndianFlag === 1;
  if (!littleEndian && littleEndianFlag !== 0) return undefined;
  offset += 1;

  const geometryType = view.getUint32(offset, littleEndian);
  offset += 4;

  const hasZ = (geometryType & 0x80000000) !== 0;
  const hasM = (geometryType & 0x40000000) !== 0;
  const hasSrid = (geometryType & 0x20000000) !== 0;
  const baseType = geometryType & 0x000000ff;
  if (baseType !== 2) return undefined;

  if (hasSrid) {
    offset += 4;
  }

  const pointCount = view.getUint32(offset, littleEndian);
  offset += 4;
  if (pointCount < 2) return undefined;

  const dimensions = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);
  const coordinates: [number, number][] = [];

  for (let index = 0; index < pointCount; index += 1) {
    if (offset + dimensions * 8 > view.byteLength) return undefined;

    const lng = view.getFloat64(offset, littleEndian);
    const lat = view.getFloat64(offset + 8, littleEndian);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return undefined;
    }

    coordinates.push([lng, lat]);
    offset += dimensions * 8;
  }

  return coordinates;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

export function mapProfileRow(row: ProfileRow): RiderProfile {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    city: row.city,
    country: row.country,
    preferredVehicleType: row.preferred_vehicle_type,
    vehicleModel: row.vehicle_model,
    vehicleYear: row.vehicle_year,
    vehicleEngineCc: row.vehicle_engine_cc,
    totalDistanceKm: row.total_distance_km,
    totalElevationM: row.total_elevation_m,
    createdAt: row.created_at
  };
}

export function mapLeaderboardRow(row: LeaderboardViewRow, rank = Number(row.rank ?? 0)): LeaderboardRow {
  return {
    rank,
    riderId: row.rider_id,
    riderName: row.rider_name,
    segmentId: row.segment_id,
    elapsedTimeSec: row.best_elapsed_time_sec,
    recordedAt: row.best_attempted_at
  };
}

export function mapUserSettingsRow(row: UserSettingsRow): UserSettings {
  return {
    id: row.id,
    userId: row.user_id,
    unitSystem: row.unit_system,
    privacyLevel: mapPrivacyLevel(row.privacy_level),
    notificationsEnabled: row.notifications_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPrivacyLevel(level: "public" | "club" | "private"): "public" | "private" | "authenticated" {
  if (level === "private") return "private";
  if (level === "public") return "public";
  return "authenticated";
}
