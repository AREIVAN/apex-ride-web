import { mapProfileRow } from "@/lib/mappers/domain-mappers";
import type { Database } from "@/lib/supabase/database.types";
import type { RiderProfile } from "@/types/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { UpdateProfileValues } from "../schemas/profile-schemas";

interface ProfileService {
  getById(profileId: string): Promise<RiderProfile | null>;
  updateOwnProfile(profileId: string, payload: UpdateProfileValues): Promise<RiderProfile>;
}

const profileIdSchema = z.string().uuid();

export function createProfileService(client: SupabaseClient<Database>): ProfileService {
  return {
    async getById(profileId) {
      const safeProfileId = profileIdSchema.parse(profileId);
      const { data, error } = await client.from("profiles").select("*").eq("id", safeProfileId).maybeSingle();
      if (error) throw new Error(`Unable to load profile: ${error.message}`);
      return data ? mapProfileRow(data) : null;
    },

    async updateOwnProfile(profileId, payload) {
      const safeProfileId = profileIdSchema.parse(profileId);

      const { data, error } = await client
        .from("profiles")
        .update({
          full_name: payload.fullName,
          username: payload.username,
          city: payload.city,
          country: payload.country,
          bio: payload.bio,
          preferred_vehicle_type: payload.preferredVehicleType,
          vehicle_model: payload.vehicleModel,
          vehicle_year: payload.vehicleYear,
          vehicle_engine_cc: payload.vehicleEngineCc,
          updated_at: new Date().toISOString()
        })
        .eq("id", safeProfileId)
        .select("*")
        .single();

      if (error) throw new Error(`Unable to update profile: ${error.message}`);

      if (
        payload.preferredVehicleType === "motorcycle" &&
        payload.vehicleModel.trim().length > 0 &&
        typeof payload.vehicleEngineCc === "number"
      ) {
        const { data: primaryVehicle, error: primaryVehicleError } = await client
          .from("vehicles")
          .select("id")
          .eq("rider_id", safeProfileId)
          .eq("is_primary", true)
          .maybeSingle();

        if (primaryVehicleError) {
          throw new Error(`Unable to read primary vehicle: ${primaryVehicleError.message}`);
        }

        if (primaryVehicle?.id) {
          const { error: updateVehicleError } = await client
            .from("vehicles")
            .update({
              label: payload.vehicleModel,
              model: payload.vehicleModel,
              engine_cc: payload.vehicleEngineCc,
              year_model: payload.vehicleYear
            })
            .eq("id", primaryVehicle.id);

          if (updateVehicleError) {
            throw new Error(`Unable to update primary vehicle: ${updateVehicleError.message}`);
          }
        } else {
          const { error: insertVehicleError } = await client.from("vehicles").insert({
            rider_id: safeProfileId,
            label: payload.vehicleModel,
            model: payload.vehicleModel,
            engine_cc: payload.vehicleEngineCc,
            year_model: payload.vehicleYear,
            is_primary: true
          });

          if (insertVehicleError) {
            throw new Error(`Unable to create primary vehicle: ${insertVehicleError.message}`);
          }
        }
      }

      return mapProfileRow(data);
    }
  };
}
