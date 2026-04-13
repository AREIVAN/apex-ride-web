import Image from "next/image";
import Link from "next/link";

import { NAV_LINKS } from "@/features/home/config/landing-content";

export function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="focus-ring inline-flex items-center gap-2 rounded-full px-2 py-1 text-white">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/15 text-xs font-bold tracking-[0.16em]">
            <Image src="/logo.png" alt="Apex Ride" width={20} height={20} className="h-5 w-5 rounded-full" priority />
          </span>
          <span className="font-[var(--font-heading)] text-base font-semibold tracking-[0.08em]">APEX RIDE</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="focus-ring rounded-md text-sm font-medium text-white/90 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-white/35 px-4 text-sm font-semibold text-white/95 hover:border-white/60"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(21,109,84,0.35)] hover:bg-brand-400"
          >
            Empezar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
