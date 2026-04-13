import Link from "next/link";

export function CtaSection() {
  return (
    <section id="cta" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="rounded-3xl border border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-brand-100 p-8 sm:p-10 lg:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Apex Ride</p>
        <h2 className="mt-3 max-w-3xl font-[var(--font-heading)] text-3xl font-bold text-asphalt-900 sm:text-4xl">
          Listo para seguir tu progreso y convertir cada ride en ventaja competitiva.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-asphalt-600">
          Crea tu cuenta y empeza hoy con tracking, segmentos y mapa de rendimiento en una sola plataforma.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl bg-asphalt-900 px-6 text-sm font-semibold text-white hover:bg-asphalt-800"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-asphalt-300 px-6 text-sm font-semibold text-asphalt-800 hover:border-asphalt-400"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}
