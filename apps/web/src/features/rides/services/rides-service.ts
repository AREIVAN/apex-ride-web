import { mapRideRow } from "@/lib/mappers/domain-mappers";
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

      const { data, error } = await client
        .from("ride_points")
        .select("speed_kmh,altitude_m,captured_at,location,rides!inner(id,rider_id)")
        .eq("ride_id", safeRideId)
        .eq("rides.rider_id", safeRiderId)
        .order("captured_at", { ascending: true });

      if (error) throw new Error(`Unable to load ride points detail: ${error.message}`);

      return (data ?? []).map((point) => ({
        speedKmh: point.speed_kmh,
        altitudeM: point.altitude_m,
        capturedAt: point.captured_at,
        latitude: extractLatitude(point.location),
        longitude: extractLongitude(point.location)
      }));
    },

    async listAttemptsForRide(rideId, riderId) {
      const safeRideId = rideIdSchema.parse(rideId);
      const safeRiderId = riderIdSchema.parse(riderId);

      const { data, error } = await client
        .from("segment_attempts")
        .select("id,segment_id,elapsed_time_sec,recorded_at,segments(name),rides!inner(rider_id)")
        .eq("ride_id", safeRideId)
        .eq("rider_id", safeRiderId)
        .eq("status", "completed")
        .eq("rides.rider_id", safeRiderId)
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

function extractLongitude(location: unknown): number | null {
  const pair = extractCoordinatePair(location);
  return pair ? pair[0] : null;
}

function extractLatitude(location: unknown): number | null {
  const pair = extractCoordinatePair(location);
  return pair ? pair[1] : null;
}

function extractCoordinatePair(location: unknown): [number, number] | null {
  if (!location) return null;

  if (typeof location === "string") {
    const pointMatch = location.match(/POINT\((-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\)/i);
    if (pointMatch) {
      return [Number(pointMatch[1]), Number(pointMatch[2])];
    }
    return null;
  }

  if (typeof location !== "object") return null;

  const maybeGeoJSON = location as {
    coordinates?: unknown;
    lng?: unknown;
    lon?: unknown;
    longitude?: unknown;
    lat?: unknown;
    latitude?: unknown;
  };

  if (Array.isArray(maybeGeoJSON.coordinates) && maybeGeoJSON.coordinates.length >= 2) {
    const lng = Number(maybeGeoJSON.coordinates[0]);
    const lat = Number(maybeGeoJSON.coordinates[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat];
    }
  }

  const lngCandidate = maybeGeoJSON.longitude ?? maybeGeoJSON.lng ?? maybeGeoJSON.lon;
  const latCandidate = maybeGeoJSON.latitude ?? maybeGeoJSON.lat;

  if (lngCandidate !== undefined && latCandidate !== undefined) {
    const lng = Number(lngCandidate);
    const lat = Number(latCandidate);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat];
    }
  }

  return null;
}
