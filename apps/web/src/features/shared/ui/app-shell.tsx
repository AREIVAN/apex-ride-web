import type { PropsWithChildren } from "react";

import { PreferencesRuntime } from "@/features/settings/components/preferences-runtime";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps extends PropsWithChildren {
  riderEmail: string;
  isAdmin?: boolean;
}

export function AppShell({ children, riderEmail, isAdmin = false }: AppShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden text-slate-900">
      <PreferencesRuntime />
      <div className="mx-auto flex w-full max-w-[1500px] min-w-0">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar riderEmail={riderEmail} isAdmin={isAdmin} />
          <main className="page-enter mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
