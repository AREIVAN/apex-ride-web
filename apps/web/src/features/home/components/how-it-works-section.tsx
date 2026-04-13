import { HOW_IT_WORKS_STEPS } from "@/features/home/config/landing-content";

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="bg-slate-950 py-16 text-slate-100 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Como funciona</p>
        <h2 className="mt-3 max-w-2xl font-[var(--font-heading)] text-3xl font-bold text-white sm:text-4xl">
          Una rutina simple para transformar movilidad en rendimiento.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((item) => (
            <article key={item.step} className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <p className="text-sm font-semibold tracking-[0.16em] text-brand-300">{item.step}</p>
              <h3 className="mt-3 font-[var(--font-heading)] text-2xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
