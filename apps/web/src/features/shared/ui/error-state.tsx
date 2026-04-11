import { Card } from "./card";

interface ErrorStateProps {
  title: string;
  description: string;
}

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <Card className="border-rose-100 bg-rose-50/70">
      <h3 className="text-lg font-semibold text-rose-700">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-rose-600">{description}</p>
    </Card>
  );
}
