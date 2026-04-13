import Link from "next/link";
import Image from "next/image";

import { logoutAction } from "@/features/auth/actions/logout-action";
import { Button } from "@/features/shared/ui/button";
import { MobileNavDrawer } from "./mobile-nav-drawer";

interface TopbarProps {
  riderEmail: string;
  isAdmin?: boolean;
}

export function Topbar({ riderEmail, isAdmin = false }: TopbarProps) {
  return (
    <header className="glass-topbar sticky top-0 z-20 border-b px-3 py-2.5 sm:px-6 lg:px-8 lg:py-3">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Image src="/32x32.png" alt="Apex Ride" width={20} height={20} className="rounded" priority />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-600">Apex Ride</p>
              <h1 className="truncate text-base font-bold text-slate-900">Centro</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/record"
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-3 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(17,102,126,0.3)] active:scale-[0.985]"
            >
              Iniciar
            </Link>
            <MobileNavDrawer isAdmin={isAdmin} />
          </div>
        </div>

        <div className="hidden items-center justify-between gap-3 lg:flex">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">Red de rodadas</p>
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">Centro Apex Ride</h1>
            <p className="truncate text-xs text-slate-500">{riderEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/record"
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(17,102,126,0.34)] transition hover:from-brand-500 hover:to-brand-600 active:scale-[0.985]"
            >
              Iniciar rodada
            </Link>
            <Link
              href="/profile"
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300/90 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white active:scale-[0.985]"
            >
              Perfil
            </Link>
            <form action={logoutAction}>
              <Button variant="ghost" type="submit" className="w-full sm:w-auto">
                Salir
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
