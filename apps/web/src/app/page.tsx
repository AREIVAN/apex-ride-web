import Link from "next/link";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";

export default function HomePage() {
  return (
    <main className="page-enter mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-8 sm:py-10">
      <section className="surface-panel-strong relative overflow-hidden rounded-3xl p-7 sm:p-10 md:p-12">
        <div className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-brand-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Apex Ride Motorcycle MVP</p>
        <h1 className="mt-3 max-w-3xl font-[var(--font-heading)] text-3xl font-bold leading-tight text-slate-900 sm:text-4xl md:text-5xl">
          Telemetria y competencia para riders que quieren una app de verdad, no otro dashboard generico.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-700">
          Grabacion GPS robusta, deteccion de intentos por segmento y performance semanal en un flujo simple para pasar
          de MVP a producto con identidad.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login">
            <Button>Iniciar sesion</Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary">Crear cuenta</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Ver dashboard conectado</Button>
          </Link>
        </div>
        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filtro GPS</dt>
            <dd className="mt-1 text-xl font-bold text-slate-900">Anti-teleport</dd>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Segmentos</dt>
            <dd className="mt-1 text-xl font-bold text-slate-900">Intentos validados</dd>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stack</dt>
            <dd className="mt-1 text-xl font-bold text-slate-900">Next + Supabase</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-semibold text-slate-900">Rodadas de moto</h2>
          <p className="mt-2 text-sm text-slate-600">Registro de salidas con distancia, desnivel y estado en tiempo real.</p>
        </Card>
        <Card>
          <h2 className="font-semibold text-slate-900">Segmentos + leaderboard</h2>
          <p className="mt-2 text-sm text-slate-600">Validacion de intentos y ranking por tramo para comunidad de riders.</p>
        </Card>
        <Card>
          <h2 className="font-semibold text-slate-900">Supabase endurecido</h2>
          <p className="mt-2 text-sm text-slate-600">Auth real, RLS coherente y modelo orientado a perfil + vehiculo.</p>
        </Card>
      </section>
    </main>
  );
}
