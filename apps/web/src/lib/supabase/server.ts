import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";
import type { Database } from "./database.types";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieList: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookieList.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch {
          // cookies cannot be set in some server component contexts
        }
      }
    }
  }) as unknown as SupabaseClient<Database>;
}
