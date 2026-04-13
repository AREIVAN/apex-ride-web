import { FEATURES } from "@/features/home/config/landing-content";

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="flex flex-col gap-4 md:max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Features</p>
        <h2 className="font-[var(--font-heading)] text-3xl font-bold text-asphalt-900 sm:text-4xl">
          Explora mapas, compite con la comunidad y mantiene el foco en progreso real.
        </h2>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <h3 className="font-[var(--font-heading)] text-2xl font-semibold text-asphalt-900">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-asphalt-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
