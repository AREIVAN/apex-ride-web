import { mapLeaderboardRow } from "@/lib/mappers/domain-mappers";
import type { Database } from "@/lib/supabase/database.types";
import type { LeaderboardRow } from "@/types/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const segmentIdSchema = z.string().uuid();

interface LeaderboardService {
  bySegment(segmentId: string): Promise<LeaderboardRow[]>;
  bySegments(segmentIds: string[]): Promise<Record<string, LeaderboardRow[]>>;
}

export function createLeaderboardService(client: SupabaseClient<Database>): LeaderboardService {
  return {
    async bySegment(segmentId) {
      const safeSegmentId = segmentIdSchema.parse(segmentId);
      const { data, error } = await client.rpc("get_segment_leaderboard", {
        p_segment_id: safeSegmentId,
        p_limit: 25
      });

      if (error) throw new Error(`Unable to load leaderboard: ${error.message}`);
      return (data ?? []).map((row) => ({
        rank: Number(row.rank),
        riderId: row.rider_id,
        riderName: row.rider_name,
        segmentId: row.segment_id,
        elapsedTimeSec: row.best_elapsed_time_sec,
        recordedAt: row.best_attempted_at
      }));
    },

    async bySegments(segmentIds) {
      if (!segmentIds.length) return {};

      const safeSegmentIds = z.array(segmentIdSchema).parse(segmentIds);

      const { data, error } = await client
        .from("segment_leaderboard")
        .select("*")
        .in("segment_id", safeSegmentIds)
        .order("rank", { ascending: true })
        .order("best_attempted_at", { ascending: true });

      if (error) throw new Error(`Unable to load segment leaderboards: ${error.message}`);

      return (data ?? []).reduce<Record<string, LeaderboardRow[]>>((acc, row) => {
        const rowsForSegment = acc[row.segment_id] ?? [];
        const mapped = mapLeaderboardRow(row);
        rowsForSegment.push(mapped);
        acc[row.segment_id] = rowsForSegment;
        return acc;
      }, {});
    }
  };
}
