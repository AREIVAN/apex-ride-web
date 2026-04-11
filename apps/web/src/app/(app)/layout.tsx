import type { PropsWithChildren } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/services/auth-server";
import { AppShell } from "@/features/shared/ui/app-shell";

async function checkIsAdmin(userId: string): Promise<boolean> {
  const client = await createClient();
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

export default async function AuthenticatedLayout({ children }: PropsWithChildren) {
  const { user } = await requireUser();
  const isAdmin = await checkIsAdmin(user.id);

  return (
    <AppShell riderEmail={user.email ?? "rider@apexride.app"} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
