import { AppShell } from "@/features/shared/ui/app-shell";

export default function MobileNavE2EPage() {
  return (
    <AppShell riderEmail="e2e@apexride.app">
      <section className="surface-panel rounded-2xl p-6">
        <h1 className="text-xl font-semibold text-slate-900">Mobile nav E2E harness</h1>
        <p className="mt-2 text-sm text-slate-600">Esta pantalla existe solo para validar apertura/cierre del drawer mobile.</p>
      </section>
    </AppShell>
  );
}
