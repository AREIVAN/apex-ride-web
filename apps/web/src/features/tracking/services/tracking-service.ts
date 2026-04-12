import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { segmentDefinitionSchema, trackPointSchema, type SegmentDefinition, type TrackPoint } from "../lib/tracking-types";

const uuidSchema = z.string().uuid();

interface FinalizeRideMetrics {
  distanceM: number;
  movingTimeSec: number;
  elevationGainM?: number;
}

interface SegmentAttemptInsert {
  segmentId: string;
  elapsedTimeSec: number;
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
        ride_id: safeRideId,
        location: `SRID=4326;POINT(${point.lng} ${point.lat})`,
        altitude_m: point.altitudeM ?? null,
        speed_kmh: point.speedMs !== null && typeof point.speedMs !== "undefined" ? point.speedMs * 3.6 : null,
        captured_at: new Date(point.timestamp).toISOString()
      }));

      const batchSize = 300;
      for (let index = 0; index < payload.length; index += batchSize) {
        const chunk = payload.slice(index, index + batchSize);
        const { error } = await client.from("ride_points").insert(chunk);
        if (error) {
          throw new Error(`Unable to store ride points: ${error.message}`);
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
        segment_id: uuidSchema.parse(attempt.segmentId),
        ride_id: safeRideId,
        rider_id: safeRiderId,
        elapsed_time_sec: Math.max(1, Math.round(attempt.elapsedTimeSec))
      }));

      const { error } = await client.from("segment_attempts").insert(payload);
      if (error) {
        throw new Error(`Unable to store segment attempts: ${error.message}`);
      }
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
