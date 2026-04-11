"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import { loginSchema, registerSchema } from "../schemas/auth-schemas";

const safeNextPathSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return "/dashboard";
    }

    return value;
  });

export interface AuthActionState {
  error: string | null;
}

export const initialAuthActionState: AuthActionState = {
  error: null
};

export async function loginAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa tus datos e intenta de nuevo." };
  }

  const nextPath = safeNextPathSchema.parse(formData.get("next") ?? undefined);
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect(nextPath);
}

export async function registerAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa tus datos e intenta de nuevo." };
  }

  const username =
    parsed.data.fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 24) || "rider";

  const client = await createClient();
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        username,
        preferred_vehicle_type: "motorcycle"
      }
    }
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    redirect("/login?registered=1");
  }

  redirect("/dashboard");
}
