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

function parseLineCoordinates(geom: unknown): [number, number][] | undefined {
  if (!geom || typeof geom !== "object") return undefined;

  const maybeGeo = geom as { coordinates?: unknown };
  if (!Array.isArray(maybeGeo.coordinates)) return undefined;

  const parsed = maybeGeo.coordinates
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
      const lng = Number(coordinate[0]);
      const lat = Number(coordinate[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      return [lng, lat] as [number, number];
    })
    .filter((coordinate): coordinate is [number, number] => Boolean(coordinate));

  return parsed.length ? parsed : undefined;
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
