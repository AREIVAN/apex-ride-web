import { mapSegmentRow } from "@/lib/mappers/domain-mappers";
import type { Database } from "@/lib/supabase/database.types";
import type { Segment } from "@/types/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { CreateSegmentValues } from "../schemas/segment-schemas";

const segmentIdSchema = z.string().uuid();

interface SegmentsService {
  listPublic(): Promise<Segment[]>;
  getById(segmentId: string): Promise<Segment | null>;
  create(creatorId: string, payload: CreateSegmentValues): Promise<Segment>;
}

export function createSegmentsService(client: SupabaseClient<Database>): SegmentsService {
  return {
    async listPublic() {
      const { data, error } = await client
        .from("segments")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (error) throw new Error(`Unable to load segments: ${error.message}`);
      return (data ?? []).map(mapSegmentRow);
    },

    async getById(segmentId) {
      const safeSegmentId = segmentIdSchema.parse(segmentId);
      const { data, error } = await client.from("segments").select("*").eq("id", safeSegmentId).maybeSingle();
      if (error) throw new Error(`Unable to load segment: ${error.message}`);
      return data ? mapSegmentRow(data) : null;
    },

    async create(creatorId, payload) {
      const safeCreatorId = z.string().uuid().parse(creatorId);
      const avgGradientPct = payload.distanceM > 0 ? (payload.elevationGainM / payload.distanceM) * 100 : 0;

      const { data, error } = await client
        .from("segments")
        .insert({
          creator_id: safeCreatorId,
          name: payload.name,
          description: payload.description,
          distance_m: payload.distanceM,
          elevation_gain_m: payload.elevationGainM,
          avg_gradient_pct: Number(avgGradientPct.toFixed(2)),
          visibility: payload.visibility,
          start_lat: payload.startLat,
          start_lng: payload.startLng,
          end_lat: payload.endLat,
          end_lng: payload.endLng
        })
        .select("*")
        .single();

      if (error) throw new Error(`Unable to create segment: ${error.message}`);
      return mapSegmentRow(data);
    }
  };
}
