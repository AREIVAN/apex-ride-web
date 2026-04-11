import { Card } from "@/features/shared/ui/card";

interface StatsWidgetProps {
  label: string;
  value: string;
  trend: string;
}

export function StatsWidget({ label, value, trend }: StatsWidgetProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-10 top-0 h-20 w-20 rounded-full bg-brand-200/35 blur-2xl" />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-emerald-600">{trend}</p>
    </Card>
  );
}
