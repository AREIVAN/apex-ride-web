import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils/cn";

interface CardProps extends PropsWithChildren {
  className?: string;
  title?: string;
  description?: string;
}

export function Card({ className, title, description, children }: CardProps) {
  return (
    <section
      className={cn(
        "surface-panel interactive-lift rounded-2xl p-5",
        className
      )}
    >
      {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : null}
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      {children}
    </section>
  );
}
