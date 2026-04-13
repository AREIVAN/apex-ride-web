import { BENEFITS } from "@/features/home/config/landing-content";

export function BenefitsSection() {
  return (
    <section id="beneficios" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="grid gap-6 md:grid-cols-3">
        {BENEFITS.map((benefit) => (
          <article key={benefit.title} className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(20,33,55,0.08)]">
            <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-asphalt-900">{benefit.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-asphalt-600">{benefit.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
