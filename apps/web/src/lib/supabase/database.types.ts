export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          bio: string;
          avatar_url: string | null;
          city: string;
          country: string;
          preferred_vehicle_type: "motorcycle" | "scooter" | "mixed";
          vehicle_model: string;
          vehicle_year: number | null;
          vehicle_engine_cc: number | null;
          total_distance_km: number;
          total_elevation_m: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string;
          bio?: string;
          avatar_url?: string | null;
          city?: string;
          country?: string;
          preferred_vehicle_type?: "motorcycle" | "scooter" | "mixed";
          vehicle_model?: string;
          vehicle_year?: number | null;
          vehicle_engine_cc?: number | null;
          total_distance_km?: number;
          total_elevation_m?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          full_name?: string;
          bio?: string;
          avatar_url?: string | null;
          city?: string;
          country?: string;
          preferred_vehicle_type?: "motorcycle" | "scooter" | "mixed";
          vehicle_model?: string;
          vehicle_year?: number | null;
          vehicle_engine_cc?: number | null;
          total_distance_km?: number;
          total_elevation_m?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      motorcycles: {
        Row: {
          id: string;
          rider_id: string;
          model: string;
          plate_code: string;
          engine_cc: number;
          year_model: number | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          rider_id: string;
          model: string;
          plate_code?: string;
          engine_cc: number;
          year_model?: number | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          model?: string;
          plate_code?: string;
          engine_cc?: number;
          year_model?: number | null;
          is_primary?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "motorcycles_rider_id_fkey";
            columns: ["rider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rides: {
        Row: {
          id: string;
          rider_id: string;
          title: string;
          status: "draft" | "recording" | "completed";
          started_at: string;
          ended_at: string | null;
          distance_km: number;
          elevation_gain_m: number;
          moving_time_sec: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rider_id: string;
          title: string;
          status?: "draft" | "recording" | "completed";
          started_at: string;
          ended_at?: string | null;
          distance_km?: number;
          elevation_gain_m?: number;
          moving_time_sec?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          status?: "draft" | "recording" | "completed";
          ended_at?: string | null;
          distance_km?: number;
          elevation_gain_m?: number;
          moving_time_sec?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rides_rider_id_fkey";
            columns: ["rider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ride_points: {
        Row: {
          id: number;
          ride_id: string;
          location: unknown;
          altitude_m: number | null;
          speed_kmh: number | null;
          captured_at: string;
        };
        Insert: {
          id?: number;
          ride_id: string;
          location: unknown;
          altitude_m?: number | null;
          speed_kmh?: number | null;
          captured_at: string;
        };
        Update: {
          location?: unknown;
          altitude_m?: number | null;
          speed_kmh?: number | null;
          captured_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ride_points_ride_id_fkey";
            columns: ["ride_id"];
            isOneToOne: false;
            referencedRelation: "rides";
            referencedColumns: ["id"];
          }
        ];
      };
      segments: {
        Row: {
          id: string;
          creator_id: string;
          name: string;
          description: string;
          distance_m: number;
          elevation_gain_m: number;
          avg_gradient_pct: number;
          visibility: "public" | "club" | "private";
          start_lat: number;
          start_lng: number;
          end_lat: number;
          end_lng: number;
          geom: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          name: string;
          description?: string;
          distance_m: number;
          elevation_gain_m: number;
          avg_gradient_pct?: number;
          visibility?: "public" | "club" | "private";
          start_lat: number;
          start_lng: number;
          end_lat: number;
          end_lng: number;
          geom?: unknown;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          visibility?: "public" | "club" | "private";
          distance_m?: number;
          elevation_gain_m?: number;
          avg_gradient_pct?: number;
          start_lat?: number;
          start_lng?: number;
          end_lat?: number;
          end_lng?: number;
          geom?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "segments_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      segment_attempts: {
        Row: {
          id: string;
          sync_key: string;
          segment_id: string;
          ride_id: string;
          rider_id: string;
          status: "completed" | "abandoned" | "invalid";
          started_at: string;
          completed_at: string | null;
          elapsed_time_sec: number | null;
          progress_final: number;
          reason: string | null;
          distance_in_segment_m: number | null;
          metadata: Json;
          avg_power_w: number | null;
          avg_heart_rate: number | null;
          recorded_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sync_key?: string;
          segment_id: string;
          ride_id: string;
          rider_id: string;
          status?: "completed" | "abandoned" | "invalid";
          started_at?: string;
          completed_at?: string | null;
          elapsed_time_sec?: number | null;
          progress_final?: number;
          reason?: string | null;
          distance_in_segment_m?: number | null;
          metadata?: Json;
          avg_power_w?: number | null;
          avg_heart_rate?: number | null;
          recorded_at?: string;
          updated_at?: string;
        };
        Update: {
          sync_key?: string;
          status?: "completed" | "abandoned" | "invalid";
          started_at?: string;
          completed_at?: string | null;
          elapsed_time_sec?: number | null;
          progress_final?: number;
          reason?: string | null;
          distance_in_segment_m?: number | null;
          metadata?: Json;
          avg_power_w?: number | null;
          avg_heart_rate?: number | null;
          recorded_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "segment_attempts_segment_id_fkey";
            columns: ["segment_id"];
            isOneToOne: false;
            referencedRelation: "segments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "segment_attempts_ride_id_fkey";
            columns: ["ride_id"];
            isOneToOne: false;
            referencedRelation: "rides";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "segment_attempts_rider_id_fkey";
            columns: ["rider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          unit_system: "metric" | "imperial";
          privacy_level: "public" | "club" | "private";
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          unit_system?: "metric" | "imperial";
          privacy_level?: "public" | "club" | "private";
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          unit_system?: "metric" | "imperial";
          privacy_level?: "public" | "club" | "private";
          notifications_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      flagged_attempts: {
        Row: {
          id: string;
          attempt_id: string;
          reason: string;
          reporter_id: string | null;
          status: "pending" | "reviewed" | "resolved";
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          reason: string;
          reporter_id?: string | null;
          status?: "pending" | "reviewed" | "resolved";
          created_at?: string;
        };
        Update: {
          reason?: string;
          reporter_id?: string | null;
          status?: "pending" | "reviewed" | "resolved";
        };
        Relationships: [
          {
            foreignKeyName: "flagged_attempts_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "segment_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flagged_attempts_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      vehicles: {
        Row: {
          id: string;
          rider_id: string;
          label: string;
          make: string;
          model: string;
          year_model: number | null;
          engine_cc: number | null;
          plate_code: string;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rider_id: string;
          label: string;
          make?: string;
          model?: string;
          year_model?: number | null;
          engine_cc?: number | null;
          plate_code?: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          make?: string;
          model?: string;
          year_model?: number | null;
          engine_cc?: number | null;
          plate_code?: string;
          is_primary?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_rider_id_fkey";
            columns: ["rider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      segment_leaderboard: {
        Row: {
          rank: number;
          segment_id: string;
          rider_id: string;
          rider_name: string;
          best_elapsed_time_sec: number;
          best_attempted_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_ride_points: {
        Args: { p_ride_id: string };
        Returns: {
          id: number;
          ride_id: string;
          lat: number;
          lng: number;
          speed_kmh: number | null;
          altitude_m: number | null;
          captured_at: string;
        }[];
      };
      insert_ride_points: {
        Args: { p_ride_id: string; p_points: Json };
        Returns: number;
      };
      get_segment_leaderboard: {
        Args: { p_segment_id: string; p_limit?: number };
        Returns: {
          rank: number;
          segment_id: string;
          rider_id: string;
          rider_name: string;
          best_elapsed_time_sec: number;
          best_attempted_at: string;
        }[];
      };
      sync_segment_attempts: {
        Args: { p_attempts: Json };
        Returns: {
          sync_key: string;
          id: string;
          status: "completed" | "abandoned" | "invalid";
          was_inserted: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
