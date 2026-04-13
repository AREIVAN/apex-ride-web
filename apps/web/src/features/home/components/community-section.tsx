import Link from "next/link";

import { COMMUNITY_METRICS } from "@/features/home/config/landing-content";

export function CommunitySection() {
  return (
    <section id="comunidad" className="bg-gradient-to-br from-asphalt-900 via-asphalt-800 to-slate-950 py-16 text-white sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-[1.2fr_1fr] md:items-end lg:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Comunidad competitiva</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-bold sm:text-4xl">
            Compite con la comunidad y sube tu nivel en cada salida.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200">
            Conecta con riders de tu ciudad, participa en tablas de segmentos y medite en tiempo real contra tus marcas.
          </p>
          <Link
            href="/leaderboards"
            className="focus-ring mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-asphalt-900 hover:bg-slate-100"
          >
            Ver leaderboards
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1">
          {COMMUNITY_METRICS.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="font-[var(--font-heading)] text-3xl font-bold text-brand-200">{metric.value}</p>
              <p className="mt-1 text-sm text-slate-300">{metric.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
