"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { cn } from "@/lib/utils/cn";
import { navigationItems } from "./navigation-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 border-r border-slate-200/70 bg-white/70 px-4 py-5 backdrop-blur-xl lg:block">
      <Link
        href="/dashboard"
        className="mb-8 block rounded-2xl bg-gradient-to-br from-asphalt-900 via-asphalt-800 to-asphalt-700 px-4 py-4 text-lg font-bold text-white shadow-[0_12px_28px_rgba(20,34,58,0.35)]"
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">Inteligencia de rodadas</p>
        <div className="mt-1 flex items-center gap-2">
          <Image src="/64x64.png" alt="Apex Ride" width={24} height={24} className="rounded" priority />
          <p className="text-xl">Apex Ride</p>
        </div>
      </Link>
      <nav className="space-y-1.5">
        {navigationItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                "transition-colors duration-200",
                active
                  ? "bg-gradient-to-r from-brand-100/90 to-brand-50 text-brand-900 shadow-[inset_0_0_0_1px_rgba(23,109,136,0.22)]"
                  : "text-slate-700 hover:bg-slate-100/85"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex min-h-7 min-w-7 items-center justify-center rounded-lg border text-[10px] leading-none",
                  active ? "border-brand-200 bg-white text-brand-700" : "border-slate-200 bg-white/80 text-slate-500"
                )}
              >
                {item.icon}
              </span>
                {item.desktopLabel}
              </Link>
          );
        })}
      </nav>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300/80 bg-white/70 p-3 text-xs text-slate-500">
        Atajos rapidos: R para Grabar, D para Panel.
      </div>
    </aside>
  );
}
