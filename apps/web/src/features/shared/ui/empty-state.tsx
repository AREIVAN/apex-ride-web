import { Card } from "./card";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="flex min-h-52 flex-col items-center justify-center gap-2 border-dashed text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="max-w-md text-sm text-slate-600">{description}</p>
    </Card>
  );
}
