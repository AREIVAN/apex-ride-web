import { Card } from "./card";

interface ErrorStateProps {
  title: string;
  description: string;
}

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <Card className="border-rose-100 bg-rose-50/70">
      <p className="chip w-fit border-rose-200 bg-rose-100/85 text-rose-700">Error</p>
      <h3 className="mt-2 text-lg font-semibold text-rose-700">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-rose-600">{description}</p>
    </Card>
  );
}
