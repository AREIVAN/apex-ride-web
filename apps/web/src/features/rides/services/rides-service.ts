import { mapRideRow } from "@/lib/mappers/domain-mappers";
import { normalizeRideTrackPoints } from "@/features/rides/lib/normalize-ride-track-points";
import type { Database } from "@/lib/supabase/database.types";
import type { Ride } from "@/types/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const riderIdSchema = z.string().uuid();
const rideIdSchema = z.string().uuid();

interface RidesService {
  listByRider(riderId: string): Promise<Ride[]>;
  getById(rideId: string, riderId: string): Promise<Ride | null>;
  getPointCount(rideId: string, riderId: string): Promise<number>;
  listPoints(rideId: string, riderId: string): Promise<Array<{
    speedKmh: number | null;
    altitudeM: number | null;
    capturedAt: string;
    latitude: number | null;
    longitude: number | null;
  }>>;
  listAttemptsForRide(
    rideId: string,
    riderId: string
  ): Promise<Array<{ id: string; segmentId: string; segmentName: string; elapsedTimeSec: number; recordedAt: string }>>;
}

export function createRidesService(client: SupabaseClient<Database>): RidesService {
  return {
    async listByRider(riderId) {
      const safeRiderId = riderIdSchema.parse(riderId);
      const { data, error } = await client
        .from("rides")
        .select("*")
        .eq("rider_id", safeRiderId)
        .order("started_at", { ascending: false });

      if (error) throw new Error(`Unable to load rides: ${error.message}`);
      return (data ?? []).map(mapRideRow);
    },

    async getById(rideId, riderId) {
      const safeRideId = rideIdSchema.parse(rideId);
      const safeRiderId = riderIdSchema.parse(riderId);

      const { data, error } = await client
        .from("rides")
        .select("*")
        .eq("id", safeRideId)
        .eq("rider_id", safeRiderId)
        .maybeSingle();

      if (error) throw new Error(`Unable to load ride: ${error.message}`);
      return data ? mapRideRow(data) : null;
    },

    async getPointCount(rideId, riderId) {
      const safeRideId = rideIdSchema.parse(rideId);
      const safeRiderId = riderIdSchema.parse(riderId);

      const { count, error } = await client
        .from("ride_points")
        .select("id,rides!inner(id,rider_id)", { count: "exact", head: true })
        .eq("ride_id", safeRideId)
        .eq("rides.rider_id", safeRiderId);

      if (error) throw new Error(`Unable to load ride points: ${error.message}`);
      return count ?? 0;
    },

    async listPoints(rideId, riderId) {
      const safeRideId = rideIdSchema.parse(rideId);
      const safeRiderId = riderIdSchema.parse(riderId);

      const { data, error } = await client.rpc("get_ride_points", { p_ride_id: safeRideId });

      if (!error) {
        return (data ?? []).map((point) => ({
          speedKmh: point.speed_kmh,
          altitudeM: point.altitude_m,
          capturedAt: point.captured_at,
          latitude: point.lat,
          longitude: point.lng,
        }));
      }

      if (!canFallbackToLegacyPointRead(error.message)) {
        throw new Error(`Unable to load ride points detail via RPC: ${error.message}`);
      }

      const legacy = await listLegacyPoints(client, safeRideId, safeRiderId);
      return legacy;
    },

    async listAttemptsForRide(rideId, riderId) {
      const safeRideId = rideIdSchema.parse(rideId);
      const safeRiderId = riderIdSchema.parse(riderId);

      const { data, error } = await client
        .from("segment_attempts")
        .select("id,segment_id,elapsed_time_sec,recorded_at,segments(name)")
        .eq("ride_id", safeRideId)
        .eq("rider_id", safeRiderId)
        .eq("status", "completed")
        .order("recorded_at", { ascending: false });

      if (error) throw new Error(`Unable to load ride attempts: ${error.message}`);

      return (data ?? []).map((attempt) => ({
        id: attempt.id,
        segmentId: attempt.segment_id,
        segmentName: Array.isArray(attempt.segments)
          ? (attempt.segments[0]?.name ?? "Segmento")
          : (attempt.segments?.name ?? "Segmento"),
        elapsedTimeSec: Number(attempt.elapsed_time_sec ?? 0),
        recordedAt: attempt.recorded_at
      }));
    }
  };
}

function canFallbackToLegacyPointRead(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the function public.get_ride_points");
}

async function listLegacyPoints(
  client: SupabaseClient<Database>,
  rideId: string,
  riderId: string
): Promise<Array<{
  speedKmh: number | null;
  altitudeM: number | null;
  capturedAt: string;
  latitude: number | null;
  longitude: number | null;
}>> {
  const { data, error } = await client
    .from("ride_points")
    .select("speed_kmh,altitude_m,captured_at,location,rides!inner(id,rider_id)")
    .eq("ride_id", rideId)
    .eq("rides.rider_id", riderId)
    .order("captured_at", { ascending: true });

  if (error) throw new Error(`Unable to load legacy ride points detail: ${error.message}`);

  return (data ?? []).map((point) => {
    const normalizedPoint = normalizeRideTrackPoints({
      location: point.location,
      speed_kmh: point.speed_kmh,
      altitude_m: point.altitude_m,
      captured_at: point.captured_at,
    })[0];

    return {
      speedKmh: point.speed_kmh,
      altitudeM: point.altitude_m,
      capturedAt: point.captured_at,
      latitude: normalizedPoint?.lat ?? null,
      longitude: normalizedPoint?.lng ?? null,
    };
  });
}
