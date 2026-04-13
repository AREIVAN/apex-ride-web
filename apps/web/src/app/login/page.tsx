import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form";
import { requireGuest } from "@/features/auth/services/auth-server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string }> }) {
  await requireGuest();
  const params = await searchParams;
  const infoMessage = params.registered === "1" ? "Cuenta creada. Si te lo pidio Supabase, confirma tu email antes de entrar." : undefined;

  return (
    <main className="page-enter mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 sm:py-12">
      <section className="hidden md:block">
        <p className="chip">Apex Ride Platform</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900">Datos en ruta, decisiones al instante.</h1>
        <p className="mt-3 max-w-md text-slate-600">
          Iniciá sesión para registrar tus rodadas, seguir métricas en vivo y competir en segmentos.
        </p>
      </section>
      <section>
        <LoginForm nextPath={params.next} infoMessage={infoMessage} />
        <p className="mt-4 text-center text-sm text-slate-600">
          No tenes cuenta?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-600">
            Registrate
          </Link>
        </p>
      </section>
    </main>
  );
}
