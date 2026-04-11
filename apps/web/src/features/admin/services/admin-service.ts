"use client";

import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

const flaggedAttemptSchema = z.object({
  id: z.string().uuid(),
  attempt_id: z.string().uuid(),
  reporter_id: z.string().uuid().nullable(),
  reason: z.string(),
  status: z.enum(["pending", "reviewed", "resolved"]),
  created_at: z.string().datetime()
});

export type FlaggedAttempt = z.infer<typeof flaggedAttemptSchema>;

const flaggedAttemptWithDetailsSchema = flaggedAttemptSchema.extend({
  reporter_username: z.string().nullable(),
  reporter_full_name: z.string().nullable(),
  attempt_rider_username: z.string().nullable(),
  attempt_rider_full_name: z.string().nullable(),
  attempt_segment_name: z.string().nullable(),
  attempt_distance_km: z.number().nullable(),
  attempt_elevation_m: z.number().nullable(),
  attempt_time_sec: z.number().nullable()
});

export type FlaggedAttemptWithDetails = z.infer<typeof flaggedAttemptWithDetailsSchema>;

interface AdminService {
  getFlaggedAttempts(status?: string): Promise<FlaggedAttemptWithDetails[]>;
  updateFlaggedAttempt(id: string, status: "reviewed" | "resolved", reviewerId: string): Promise<FlaggedAttempt>;
  isAdmin(userId: string): Promise<boolean>;
}

export function createAdminService(client: SupabaseClient<Database>): AdminService {
  return {
async getFlaggedAttempts(status) {
      let query = client
        .from("flagged_attempts")
        .select(`
          id,
          attempt_id,
          reporter_id,
          reason,
          status,
          created_at,
          reporter:profiles!flagged_attempts_reporter_id_fkey(username, full_name),
          attempt:segment_attempts!flagged_attempts_attempt_id_fkey(
            rider_id,
            segment_id,
            distance_km,
            elevation_gain_m,
            time_sec,
            segment:segments(name),
            rider:profiles!segment_attempts_rider_id_fk(username, full_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status as "pending" | "reviewed" | "resolved");
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Unable to fetch flagged attempts: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        attempt_id: row.attempt_id as string,
        reporter_id: (row.reporter as Record<string, string> | null)?.id ?? null,
        reason: row.reason as string,
        status: row.status as "pending" | "reviewed" | "resolved",
        created_at: row.created_at as string,
        reporter_username: (row.reporter as Record<string, string> | null)?.username ?? null,
        reporter_full_name: (row.reporter as Record<string, string> | null)?.full_name ?? null,
        attempt_rider_username: ((row.attempt as Record<string, Record<string, string>> | null)?.rider as Record<string, string> | null)?.username ?? null,
        attempt_rider_full_name: ((row.attempt as Record<string, Record<string, string>> | null)?.rider as Record<string, string> | null)?.full_name ?? null,
        attempt_segment_name: ((row.attempt as Record<string, Record<string, string>> | null)?.segment as Record<string, string> | null)?.name ?? null,
        attempt_distance_km: (row.attempt as Record<string, number> | null)?.distance_km ?? null,
        attempt_elevation_m: (row.attempt as Record<string, number> | null)?.elevation_gain_m ?? null,
        attempt_time_sec: (row.attempt as Record<string, number> | null)?.time_sec ?? null
      }));
    },

    async updateFlaggedAttempt(id, status, reviewerId) {
      const { data, error } = await client
        .from("flagged_attempts")
        .update({
          status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString()
        } as unknown as { status?: "pending" | "reviewed" | "resolved" })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Unable to update flagged attempt: ${error.message}`);
      }

      return {
        id: data.id,
        attempt_id: data.attempt_id,
        reporter_id: data.reporter_id,
        reason: data.reason,
        status: data.status as "pending" | "reviewed" | "resolved",
        created_at: data.created_at
      };
    },

    async isAdmin(userId) {
      const { data, error } = await client
        .from("profiles")
        .select("bio")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      return data.bio === "admin";
    }
  };
}