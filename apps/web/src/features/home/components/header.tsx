"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { NAV_LINKS } from "@/features/home/config/landing-content";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-20 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className={`mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10 transition-colors duration-300`}>
        <Link
          href="/"
          className={`focus-ring inline-flex items-center gap-2 rounded-full px-2 py-1 ${
            isScrolled ? "text-asphalt-900" : "text-white"
          }`}
        >
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/15 text-xs font-bold tracking-[0.16em] ${
              isScrolled ? "border-asphalt-200" : "border-white/40"
            }`}
          >
            <Image
              src="/logo.png"
              alt="Apex Ride"
              width={20}
              height={20}
              className="h-5 w-5 rounded-full"
              priority
            />
          </span>
          <span className="font-[var(--font-heading)] text-base font-semibold tracking-[0.08em]">
            APEX RIDE
          </span>
        </Link>

        <nav className={`hidden items-center gap-7 md:flex`}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`focus-ring rounded-md text-sm font-medium transition-colors duration-300 ${
                isScrolled
                  ? "text-asphalt-700 hover:text-asphalt-900"
                  : "text-white/90 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-all duration-300 ${
              isScrolled
                ? "border-asphalt-300 text-asphalt-700 hover:border-asphalt-400 hover:bg-asphalt-50"
                : "border-white/35 text-white/95 hover:border-white/60"
            }`}
          >
            Login
          </Link>
          <Link
            href="/register"
            className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 ${
              isScrolled
                ? "bg-brand-500 shadow-brand-500/20 hover:bg-brand-400 hover:shadow-brand-400/30"
                : "bg-brand-500 shadow-brand-500/30 hover:bg-brand-400 hover:shadow-brand-400/40"
            }`}
          >
            Empezar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
