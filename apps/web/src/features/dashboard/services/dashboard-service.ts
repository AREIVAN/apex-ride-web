import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

const riderIdSchema = z.string().uuid();

export interface DashboardSnapshot {
  periods: {
    day: { rides: number; distanceKm: number; elevationM: number };
    week: { rides: number; distanceKm: number; elevationM: number };
    month: { rides: number; distanceKm: number; elevationM: number };
  };
  comparisons: {
    week: { ridesDeltaPct: number; distanceDeltaPct: number; elevationDeltaPct: number };
    month: { ridesDeltaPct: number; distanceDeltaPct: number; elevationDeltaPct: number };
  };
  recentAttempts: number;
  recentRides: Array<{
    id: string;
    title: string;
    startedAt: string;
    distanceKm: number;
    movingTimeSec: number;
    elevationGainM: number;
  }>;
  latestAttempts: Array<{
    segmentId: string;
    segmentName: string;
    elapsedTimeSec: number;
    recordedAt: string;
  }>;
}

export async function getDashboardSnapshot(client: SupabaseClient<Database>, riderId: string): Promise<DashboardSnapshot> {
  const safeRiderId = riderIdSchema.parse(riderId);
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twoMonthsAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [ridesResult, attemptsResult] = await Promise.all([
    client
      .from("rides")
      .select("id,title,started_at,distance_km,elevation_gain_m,moving_time_sec")
      .eq("rider_id", safeRiderId)
      .gte("started_at", twoMonthsAgo)
      .eq("status", "completed"),
    client
      .from("segment_attempts")
      .select("segment_id,elapsed_time_sec,recorded_at", { count: "exact" })
      .eq("rider_id", safeRiderId)
      .eq("status", "completed")
      .gte("recorded_at", monthAgo)
      .order("recorded_at", { ascending: false })
      .limit(20)
  ]);

  if (ridesResult.error) {
    throw new Error(`Unable to load dashboard rides: ${ridesResult.error.message}`);
  }

  if (attemptsResult.error) {
    throw new Error(`Unable to load dashboard attempts: ${attemptsResult.error.message}`);
  }

  const rides = (ridesResult.data ?? []).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  const attempts = attemptsResult.data ?? [];
  const segmentIds = Array.from(new Set(attempts.map((attempt) => attempt.segment_id)));

  const segmentNamesById = new Map<string, string>();
  if (segmentIds.length > 0) {
    const { data: segmentsData, error: segmentsError } = await client
      .from("segments")
      .select("id,name")
      .in("id", segmentIds);

    if (segmentsError) {
      throw new Error(`Unable to load dashboard segments: ${segmentsError.message}`);
    }

    for (const segment of segmentsData ?? []) {
      segmentNamesById.set(segment.id, segment.name);
    }
  }

  const day = rides.filter((ride) => ride.started_at >= dayAgo);
  const week = rides.filter((ride) => ride.started_at >= weekAgo);
  const previousWeek = rides.filter((ride) => ride.started_at >= twoWeeksAgo && ride.started_at < weekAgo);
  const month = rides.filter((ride) => ride.started_at >= monthAgo);
  const previousMonth = rides.filter((ride) => ride.started_at >= twoMonthsAgo && ride.started_at < monthAgo);

  function aggregate(slice: typeof rides) {
    return {
      rides: slice.length,
      distanceKm: slice.reduce((acc, ride) => acc + Number(ride.distance_km ?? 0), 0),
      elevationM: slice.reduce((acc, ride) => acc + Number(ride.elevation_gain_m ?? 0), 0)
    };
  }

  function delta(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  const weekAgg = aggregate(week);
  const previousWeekAgg = aggregate(previousWeek);
  const monthAgg = aggregate(month);
  const previousMonthAgg = aggregate(previousMonth);

  return {
    periods: {
      day: aggregate(day),
      week: weekAgg,
      month: monthAgg
    },
    comparisons: {
      week: {
        ridesDeltaPct: delta(weekAgg.rides, previousWeekAgg.rides),
        distanceDeltaPct: delta(weekAgg.distanceKm, previousWeekAgg.distanceKm),
        elevationDeltaPct: delta(weekAgg.elevationM, previousWeekAgg.elevationM)
      },
      month: {
        ridesDeltaPct: delta(monthAgg.rides, previousMonthAgg.rides),
        distanceDeltaPct: delta(monthAgg.distanceKm, previousMonthAgg.distanceKm),
        elevationDeltaPct: delta(monthAgg.elevationM, previousMonthAgg.elevationM)
      }
    },
    recentAttempts: attempts.filter((attempt) => attempt.recorded_at >= weekAgo).length,
    recentRides: rides.slice(0, 6).map((ride) => ({
      id: ride.id,
      title: ride.title,
      startedAt: ride.started_at,
      distanceKm: Number(ride.distance_km ?? 0),
      movingTimeSec: Number(ride.moving_time_sec ?? 0),
      elevationGainM: Number(ride.elevation_gain_m ?? 0)
    })),
    latestAttempts: attempts.slice(0, 6).map((attempt) => ({
      segmentId: attempt.segment_id,
      segmentName: segmentNamesById.get(attempt.segment_id) ?? "Segmento sin nombre",
      elapsedTimeSec: Number(attempt.elapsed_time_sec ?? 0),
      recordedAt: attempt.recorded_at
    }))
  };
}
