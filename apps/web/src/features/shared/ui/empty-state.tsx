import type { ReactNode } from "react";

import { Card } from "./card";

interface EmptyStateProps {
  title: string;
  description: string;
  compact?: boolean;
  action?: ReactNode;
}

export function EmptyState({ title, description, compact = false, action }: EmptyStateProps) {
  return (
    <Card className={`flex flex-col items-center justify-center gap-3 border-dashed text-center ${compact ? "min-h-36 p-4" : "min-h-56"}`}>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">-</div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="max-w-md text-sm text-slate-600">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  );
}
