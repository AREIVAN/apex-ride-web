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
    }
  };
}
