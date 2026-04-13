import Link from "next/link";

import { HERO_BACKGROUND_IMAGE } from "@/features/home/config/landing-content";

export function Hero() {
  return (
    <section
      className="relative isolate flex min-h-[100svh] items-end overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(108deg, rgba(7, 14, 22, 0.78) 15%, rgba(7, 14, 22, 0.35) 55%, rgba(7, 14, 22, 0.82) 100%), url(${HERO_BACKGROUND_IMAGE})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(31,196,157,0.3),transparent_38%),radial-gradient(circle_at_85%_80%,rgba(31,82,123,0.35),transparent_38%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-5 pb-16 pt-36 sm:px-8 lg:px-10 lg:pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">
          Performance Mobility Platform
        </p>
        <h1 className="mt-5 max-w-3xl font-[var(--font-heading)] text-4xl font-bold leading-[1.02] text-white sm:text-5xl lg:text-7xl">
          Mejora tu rendimiento Registra cada ride Domina cada segmento.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
          Apex Ride transforma salidas en progreso real: tracking preciso, mapas
          accionables y competencia comunitaria para riders que entrenan con
          ambicion.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-500 px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white hover:bg-brand-400"
          >
            Crear cuenta
          </Link>
          <a
            href="#como-funciona"
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-white/45 px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white hover:border-white"
          >
            Ver como funciona
          </a>
        </div>
      </div>
    </section>
  );
}
