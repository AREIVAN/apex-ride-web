import Link from "next/link";

import { logoutAction } from "@/features/auth/actions/logout-action";
import { Button } from "@/features/shared/ui/button";

interface TopbarProps {
  riderEmail: string;
  isAdmin?: boolean;
}

export function Topbar({ riderEmail, isAdmin = false }: TopbarProps) {
  return (
    <header className="glass-topbar sticky top-0 z-20 border-b px-3 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">Red de rodadas</p>
          <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">Centro Apex Ride</h1>
          <p className="truncate text-xs text-slate-500">{riderEmail}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Link
            href="/record"
            className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(17,102,126,0.34)] transition hover:from-brand-500 hover:to-brand-600 active:scale-[0.985] sm:flex-none"
          >
            Iniciar rodada
          </Link>
          <Link
            href="/profile"
            className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300/90 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white active:scale-[0.985] sm:flex-none"
          >
            Perfil
          </Link>
          <form action={logoutAction} className="w-full sm:w-auto">
              <Button variant="ghost" type="submit" className="w-full sm:w-auto">
              Salir
              </Button>
            </form>
        </div>

        <nav className="table-scroll -mx-1 flex w-full gap-2 px-1 pb-1 lg:hidden" aria-label="Navegacion movil">
          <Link href="/dashboard" className="focus-ring inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white active:scale-[0.985]">
            Panel
          </Link>
          <Link href="/rides" className="focus-ring inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white active:scale-[0.985]">
            Rodadas
          </Link>
          <Link href="/segments" className="focus-ring inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white active:scale-[0.985]">
            Segmentos
          </Link>
          <Link href="/leaderboards" className="focus-ring inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white active:scale-[0.985]">
            Clasificacion
          </Link>
          <Link href="/settings" className="focus-ring inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-slate-300/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white active:scale-[0.985]">
            Ajustes
          </Link>
          {isAdmin && (
            <Link href="/admin" className="focus-ring inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-red-300/80 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 active:scale-[0.985]">
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
