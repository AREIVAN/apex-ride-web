import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

interface PageHeaderProps extends PropsWithChildren {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className, children }: PageHeaderProps) {
  return (
    <header className={cn("surface-panel-strong rounded-2xl p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-subtitle max-w-2xl">{description}</p> : null}
        </div>
        {actions ? <div className="flex w-full items-center gap-2 sm:w-auto">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
