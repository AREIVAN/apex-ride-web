import type { PropsWithChildren } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps extends PropsWithChildren {
  riderEmail: string;
  isAdmin?: boolean;
}

export function AppShell({ children, riderEmail, isAdmin = false }: AppShellProps) {
  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto flex w-full max-w-[1500px]">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar riderEmail={riderEmail} isAdmin={isAdmin} />
          <main className="page-enter mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
