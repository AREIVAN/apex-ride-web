import { Card } from "@/features/shared/ui/card";

interface StatsWidgetProps {
  label: string;
  value: string;
  trend: string;
}

export function StatsWidget({ label, value, trend }: StatsWidgetProps) {
  return (
    <Card className="relative overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full bg-brand-200/35 blur-2xl" />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{value}</p>
      <p className="mt-2 text-sm text-emerald-700">{trend}</p>
    </Card>
  );
}
