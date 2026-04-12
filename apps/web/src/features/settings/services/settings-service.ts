import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

const settingsSchema = z.object({
  unitSystem: z.enum(["metric", "imperial"]).optional(),
  activityVisibility: z.enum(["public", "club", "private"]).optional(),
  notificationsSegments: z.boolean().optional()
});

export type UserSettings = z.infer<typeof settingsSchema>;

const defaultSettings: UserSettings = {
  unitSystem: "metric",
  activityVisibility: "public",
  notificationsSegments: true
};

interface SettingsService {
  getSettings(userId: string): Promise<UserSettings | null>;
  updateSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings>;
}

export function createSettingsService(client: SupabaseClient<Database>): SettingsService {
  return {
    async getSettings(userId: string) {
      const { data, error } = await client
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(`Unable to fetch settings: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        unitSystem: data.unit_system,
        activityVisibility: data.privacy_level,
        notificationsSegments: data.notifications_enabled
      };
    },

    async updateSettings(userId: string, updates: Partial<UserSettings>) {
      const validated = settingsSchema.partial().parse(updates);

      const { data: existing } = await client
        .from("user_settings")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const updatesObj: {
          unit_system?: "metric" | "imperial";
          privacy_level?: "public" | "club" | "private";
          notifications_enabled?: boolean;
          updated_at?: string;
        } = {
          updated_at: new Date().toISOString()
        };
        if (validated.unitSystem !== undefined) updatesObj.unit_system = validated.unitSystem;
        if (validated.activityVisibility !== undefined) updatesObj.privacy_level = validated.activityVisibility;
        if (validated.notificationsSegments !== undefined) updatesObj.notifications_enabled = validated.notificationsSegments;

        const { data, error } = await client
          .from("user_settings")
          .update(updatesObj)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (error) {
          throw new Error(`Unable to update settings: ${error.message}`);
        }

        return {
          unitSystem: data.unit_system,
          activityVisibility: data.privacy_level,
          notificationsSegments: data.notifications_enabled
        };
      } else {
        const insertObj: {
          user_id: string;
          unit_system?: "metric" | "imperial";
          privacy_level?: "public" | "club" | "private";
          notifications_enabled?: boolean;
        } = {
          user_id: userId,
          unit_system: validated.unitSystem ?? "metric",
          privacy_level: validated.activityVisibility ?? "public",
          notifications_enabled: validated.notificationsSegments ?? true
        };

        const { data, error } = await client
          .from("user_settings")
          .insert(insertObj as typeof insertObj)
          .select("*")
          .single();

        if (error) {
          throw new Error(`Unable to create settings: ${error.message}`);
        }

        return {
          unitSystem: data.unit_system,
          activityVisibility: data.privacy_level,
          notificationsSegments: data.notifications_enabled
        };
      }
    }
  };
}