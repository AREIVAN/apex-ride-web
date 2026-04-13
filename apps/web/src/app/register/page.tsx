import Link from "next/link";

import { RegisterForm } from "@/features/auth/components/register-form";
import { requireGuest } from "@/features/auth/services/auth-server";

export default async function RegisterPage() {
  await requireGuest();

  return (
    <main className="page-enter mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 sm:py-12">
      <section className="hidden md:block">
        <p className="chip">Comunidad Apex Ride</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900">Crea tu perfil y sali a rodar.</h1>
        <p className="mt-3 max-w-md text-slate-600">
          Configura tus datos base para empezar a guardar rutas y entrar en los leaderboards.
        </p>
      </section>
      <section>
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-slate-600">
          Ya tenes cuenta?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-600">
            Inicia sesion
          </Link>
        </p>
      </section>
    </main>
  );
}
