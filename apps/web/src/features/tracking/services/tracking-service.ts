import { z } from "zod";

import type { Database, Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { segmentDefinitionSchema, trackPointSchema, type SegmentDefinition, type TrackPoint } from "../lib/tracking-types";
import type { SegmentAttempt } from "@/types/domain";

const uuidSchema = z.string().uuid();

interface FinalizeRideMetrics {
  distanceM: number;
  movingTimeSec: number;
  elevationGainM?: number;
}

interface SegmentAttemptInsert {
  syncKey: string;
  segmentId: string;
  status: "completed" | "abandoned" | "invalid";
  startedAt: string;
  completedAt: string | null;
  elapsedTimeSec: number | null;
  progressFinal: number;
  reason: string | null;
  distanceInSegmentM?: number | null;
  metadata?: unknown;
  recordedAt: string;
}

interface TrackingService {
  listTrackableSegments(): Promise<SegmentDefinition[]>;
  startRide(riderId: string): Promise<string>;
  saveRidePoints(rideId: string, points: TrackPoint[]): Promise<void>;
  saveSegmentAttempts(rideId: string, riderId: string, attempts: SegmentAttemptInsert[]): Promise<void>;
  finalizeRide(rideId: string, metrics: FinalizeRideMetrics): Promise<void>;
}

export function createTrackingService(client: SupabaseClient<Database>): TrackingService {
  return {
    async listTrackableSegments() {
      const { data, error } = await client
        .from("segments")
        .select("id,name,start_lat,start_lng,end_lat,end_lng")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        throw new Error(`Unable to load segments for tracking: ${error.message}`);
      }

      return (data ?? []).map((segment) =>
        segmentDefinitionSchema.parse({
          id: segment.id,
          name: segment.name || undefined,
          start: { lat: segment.start_lat, lng: segment.start_lng },
          end: { lat: segment.end_lat, lng: segment.end_lng },
          route: [
            { lat: segment.start_lat, lng: segment.start_lng },
            { lat: segment.end_lat, lng: segment.end_lng }
          ],
          radiusM: 35
        })
      );
    },

    async startRide(riderId) {
      const safeRiderId = uuidSchema.parse(riderId);
      const startedAt = new Date().toISOString();
      const title = `Rodada ${new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })}`;

      const { data, error } = await client
        .from("rides")
        .insert({
          rider_id: safeRiderId,
          title,
          status: "recording",
          started_at: startedAt,
          distance_km: 0,
          elevation_gain_m: 0,
          moving_time_sec: 0
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Unable to create ride: ${error.message}`);
      }

      return data.id;
    },

    async saveRidePoints(rideId, rawPoints) {
      const safeRideId = uuidSchema.parse(rideId);
      const points = rawPoints.map((point) => trackPointSchema.parse(point));

      if (!points.length) {
        return;
      }

      const payload = points.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        altitudeM: point.altitudeM ?? null,
        speedKmh: point.speedMs !== null && typeof point.speedMs !== "undefined" ? point.speedMs * 3.6 : null,
        capturedAt: new Date(point.timestamp).toISOString()
      }));

      const batchSize = 300;
      for (let index = 0; index < payload.length; index += batchSize) {
        const chunk = payload.slice(index, index + batchSize);
        try {
          const { data: insertedCount, error } = await client.rpc("insert_ride_points", {
            p_ride_id: safeRideId,
            p_points: chunk as Json
          });

          if (error) {
            throw new Error(`Unable to store ride points via RPC: ${error.message}`);
          }

          if (typeof insertedCount === "number" && insertedCount < chunk.length) {
            console.warn("[Tracking] Some ride points were ignored by validation", {
              rideId: safeRideId,
              requested: chunk.length,
              inserted: insertedCount,
            });
          }
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("Unable to store ride points")) {
            throw error;
          }

          const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          throw new Error(`Unable to store ride points via RPC. Local points were not deleted; retry sync when connectivity returns. Detail: ${message}`);
        }
      }
    },

    async saveSegmentAttempts(rideId, riderId, attempts) {
      const safeRideId = uuidSchema.parse(rideId);
      const safeRiderId = uuidSchema.parse(riderId);

      if (!attempts.length) {
        return;
      }

      const payload = attempts.map((attempt) => ({
        sync_key: attempt.syncKey,
        segment_id: uuidSchema.parse(attempt.segmentId),
        ride_id: safeRideId,
        rider_id: safeRiderId,
        status: attempt.status,
        started_at: new Date(attempt.startedAt).toISOString(),
        completed_at: attempt.completedAt ? new Date(attempt.completedAt).toISOString() : null,
        elapsed_time_sec:
          attempt.status === "completed" && typeof attempt.elapsedTimeSec === "number"
            ? Math.max(1, Math.round(attempt.elapsedTimeSec))
            : null,
        progress_final: Number(attempt.progressFinal.toFixed(2)),
        reason: attempt.reason,
        distance_in_segment_m: typeof attempt.distanceInSegmentM === "number" ? Number(attempt.distanceInSegmentM.toFixed(2)) : null,
        metadata: toJsonValue(attempt.metadata),
        recorded_at: new Date(attempt.recordedAt).toISOString()
      }));

      const { error } = await client.rpc("sync_segment_attempts", {
        p_attempts: payload
      });

      if (!error) {
        return;
      }

      if (canFallbackToLegacyInsert(error.message)) {
        await insertLegacyAttempts(client, safeRideId, safeRiderId, attempts);
        return;
      }

      throw new Error(`Unable to store segment attempts: ${error.message}`);
    },

    async finalizeRide(rideId, metrics) {
      const safeRideId = uuidSchema.parse(rideId);
      const safeMetrics = z
        .object({
          distanceM: z.number().finite().nonnegative(),
          movingTimeSec: z.number().int().nonnegative(),
          elevationGainM: z.number().int().nonnegative().optional()
        })
        .parse(metrics);

      const { error } = await client
        .from("rides")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
          distance_km: Number((safeMetrics.distanceM / 1000).toFixed(2)),
          elevation_gain_m: safeMetrics.elevationGainM ?? 0,
          moving_time_sec: safeMetrics.movingTimeSec
        })
        .eq("id", safeRideId);

      if (error) {
        throw new Error(`Unable to finalize ride: ${error.message}`);
      }
    }
  };
}

function toJsonValue(value: unknown): Json {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (value && typeof value === "object") {
    const output: { [key: string]: Json | undefined } = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = toJsonValue(item);
    }
    return output;
  }

  return {};
}

function canFallbackToLegacyInsert(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the function public.sync_segment_attempts") ||
    normalized.includes("column \"status\" of relation \"segment_attempts\" does not exist") ||
    normalized.includes("column \"started_at\" of relation \"segment_attempts\" does not exist")
  );
}

async function insertLegacyAttempts(
  client: SupabaseClient<Database>,
  rideId: string,
  riderId: string,
  attempts: SegmentAttemptInsert[]
): Promise<void> {
  const legacyPayload = attempts
    .filter((attempt) => attempt.status === "completed" && typeof attempt.elapsedTimeSec === "number")
    .map((attempt) => ({
      segment_id: attempt.segmentId,
      ride_id: rideId,
      rider_id: riderId,
      elapsed_time_sec: Math.max(1, Math.round(attempt.elapsedTimeSec ?? 0))
    }));

  if (!legacyPayload.length) {
    return;
  }

  const { error } = await client.from("segment_attempts").insert(legacyPayload);
  if (error) {
    throw new Error(`Unable to store segment attempts with legacy fallback: ${error.message}`);
  }
}

export function mapDomainAttemptToBackendInsert(attempt: SegmentAttempt): SegmentAttemptInsert {
  return {
    syncKey: attempt.syncKey,
    segmentId: attempt.segmentId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    elapsedTimeSec: attempt.elapsedSec,
    progressFinal: attempt.progressFinal,
    reason: attempt.reason,
    distanceInSegmentM: attempt.distanceInSegmentM ?? null,
    metadata: attempt.metadata,
    recordedAt: attempt.recordedAt
  };
}
