import Link from "next/link";

import { logoutAction } from "@/features/auth/actions/logout-action";
import { Button } from "@/features/shared/ui/button";

interface TopbarProps {
  riderEmail: string;
  isAdmin?: boolean;
}

export function Topbar({ riderEmail, isAdmin = false }: TopbarProps) {
  return (
    <header className="glass-topbar sticky top-0 z-20 border-b px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Motorcycle Ride Network</p>
          <h1 className="text-lg font-bold text-slate-900">Apex Ride Control</h1>
          <p className="text-xs text-slate-500">{riderEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/record"
            className="focus-ring inline-flex min-h-11 items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(17,102,126,0.34)] transition hover:from-brand-500 hover:to-brand-600"
          >
            Start Ride
          </Link>
          <Link
            href="/profile"
            className="focus-ring inline-flex min-h-11 items-center rounded-xl border border-slate-300/90 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
          >
            Profile
          </Link>
          <form action={logoutAction}>
            <Button variant="ghost" type="submit">
              Logout
            </Button>
          </form>
        </div>

        <nav className="-mx-1 flex w-full gap-2 overflow-x-auto px-1 pb-1 lg:hidden" aria-label="Navegacion movil">
          <Link href="/dashboard" className="focus-ring whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Dashboard
          </Link>
          <Link href="/rides" className="focus-ring whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Rides
          </Link>
          <Link href="/segments" className="focus-ring whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Segments
          </Link>
          <Link href="/leaderboards" className="focus-ring whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Leaderboards
          </Link>
          <Link href="/settings" className="focus-ring whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Settings
          </Link>
          {isAdmin && (
            <a href="/admin" className="focus-ring whitespace-nowrap rounded-lg border border-red-300/80 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
              Admin
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
