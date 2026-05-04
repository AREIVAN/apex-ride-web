"use client";

import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

import { PreferencesRuntime } from "@/features/settings/components/preferences-runtime";
import { cn } from "@/lib/utils/cn";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps extends PropsWithChildren {
  riderEmail: string;
  isAdmin?: boolean;
}

interface AppShellNavigationModeContextValue {
  isNavigationMode: boolean;
  setNavigationMode: (isNavigationMode: boolean) => void;
}

const AppShellNavigationModeContext = createContext<AppShellNavigationModeContextValue | null>(null);

export function useAppShellNavigationMode() {
  const context = useContext(AppShellNavigationModeContext);

  if (!context) {
    throw new Error("useAppShellNavigationMode must be used inside AppShell");
  }

  return context;
}

export function AppShell({ children, riderEmail, isAdmin = false }: AppShellProps) {
  const [isNavigationMode, setNavigationMode] = useState(false);
  const navigationModeContext = useMemo(
    () => ({ isNavigationMode, setNavigationMode }),
    [isNavigationMode]
  );

  return (
    <AppShellNavigationModeContext.Provider value={navigationModeContext}>
      <div className="min-h-screen overflow-x-hidden text-slate-900">
        <PreferencesRuntime />
        <div
          className={cn(
            "mx-auto flex w-full min-w-0",
            isNavigationMode ? "h-dvh max-w-none" : "max-w-[1500px]"
          )}
        >
          {!isNavigationMode && <Sidebar />}
          <div className="min-w-0 flex-1">
            {!isNavigationMode && <Topbar riderEmail={riderEmail} isAdmin={isAdmin} />}
            <main
              className={cn(
                "w-full",
                isNavigationMode
                  ? "h-dvh max-w-none overflow-hidden p-0"
                  : "page-enter mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-7"
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </AppShellNavigationModeContext.Provider>
  );
}
