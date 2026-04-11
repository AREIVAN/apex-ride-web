import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

const riderIdSchema = z.string().uuid();

export interface DashboardSnapshot {
  weeklyDistanceKm: number;
  weeklyElevationM: number;
  recentPrs: number;
}

export async function getDashboardSnapshot(client: SupabaseClient<Database>, riderId: string): Promise<DashboardSnapshot> {
  const safeRiderId = riderIdSchema.parse(riderId);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [ridesResult, attemptsResult] = await Promise.all([
    client
      .from("rides")
      .select("distance_km,elevation_gain_m")
      .eq("rider_id", safeRiderId)
      .gte("started_at", weekAgo)
      .eq("status", "completed"),
    client
      .from("segment_attempts")
      .select("segment_id", { count: "exact" })
      .eq("rider_id", safeRiderId)
      .gte("recorded_at", weekAgo)
  ]);

  if (ridesResult.error) {
    throw new Error(`Unable to load dashboard rides: ${ridesResult.error.message}`);
  }

  if (attemptsResult.error) {
    throw new Error(`Unable to load dashboard attempts: ${attemptsResult.error.message}`);
  }

  const weeklyDistanceKm = (ridesResult.data ?? []).reduce((acc, ride) => acc + Number(ride.distance_km ?? 0), 0);
  const weeklyElevationM = (ridesResult.data ?? []).reduce((acc, ride) => acc + Number(ride.elevation_gain_m ?? 0), 0);
  const recentPrs = attemptsResult.count ?? 0;

  return { weeklyDistanceKm, weeklyElevationM, recentPrs };
}
