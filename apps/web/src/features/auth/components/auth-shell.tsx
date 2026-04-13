import type { ReactNode } from "react";

import { AUTH_BACKGROUND_IMAGE } from "@/features/auth/config/auth-content";

interface AuthShellProps {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ badge, title, description, children, footer }: AuthShellProps) {
  return (
    <main
      className="page-enter flex min-h-screen items-center justify-center bg-slate-950 bg-cover bg-center bg-no-repeat px-4 py-8 sm:px-6 sm:py-10"
      style={{
        backgroundImage: `linear-gradient(120deg, rgba(2, 6, 23, 0.82) 10%, rgba(2, 6, 23, 0.58) 48%, rgba(2, 6, 23, 0.9) 100%), url(${AUTH_BACKGROUND_IMAGE})`
      }}
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 rounded-3xl border border-white/20 bg-slate-950/40 p-4 shadow-2xl shadow-black/35 backdrop-blur-[2px] sm:p-6 md:grid-cols-2 lg:p-8">
        <section className="hidden text-slate-100 md:block">
          <p className="chip border-white/20 bg-white/10 text-slate-100">{badge}</p>
          <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">{title}</h1>
          <p className="mt-3 max-w-md text-slate-200/90">{description}</p>
        </section>

        <section className="space-y-4">
          {children}
          <p className="text-center text-sm text-slate-200">{footer}</p>
        </section>
      </div>
    </main>
  );
}
