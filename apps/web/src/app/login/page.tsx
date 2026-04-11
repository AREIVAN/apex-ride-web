import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form";
import { requireGuest } from "@/features/auth/services/auth-server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string }> }) {
  await requireGuest();
  const params = await searchParams;
  const infoMessage = params.registered === "1" ? "Cuenta creada. Si te lo pidio Supabase, confirma tu email antes de entrar." : undefined;

  return (
    <main className="page-enter mx-auto min-h-screen max-w-5xl px-4 py-10 sm:py-12">
      <LoginForm nextPath={params.next} infoMessage={infoMessage} />
      <p className="mt-4 text-center text-sm text-slate-600">
        No tenes cuenta?{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-600">
          Registrate
        </Link>
      </p>
    </main>
  );
}
