"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rides", label: "Rides" },
  { href: "/record", label: "Record" },
  { href: "/segments", label: "Segments" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" }
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 border-r border-slate-200/80 bg-white/85 px-4 py-6 backdrop-blur lg:block">
      <Link
        href="/dashboard"
        className="mb-8 block rounded-xl bg-gradient-to-br from-asphalt-900 to-asphalt-700 px-4 py-3 text-lg font-bold text-white shadow-[0_10px_22px_rgba(20,34,58,0.35)]"
      >
        Apex Ride
      </Link>
      <nav className="space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring block rounded-lg px-3 py-2 text-sm font-medium text-slate-700",
              "transition duration-150 hover:bg-slate-100/90",
              pathname === item.href ? "bg-brand-50 text-brand-800" : null
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
