"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";
import type { Database } from "./database.types";

export function createClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey) as unknown as SupabaseClient<Database>;
}
