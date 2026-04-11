import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const client = await createClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { client, user };
}

export async function requireGuest() {
  const client = await createClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }
}
