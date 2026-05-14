"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { HERO_BACKGROUND_IMAGE } from "@/features/home/config/landing-content";

export function Hero() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <section
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(108deg, rgba(7, 14, 22, 0.78) 15%, rgba(7, 14, 22, 0.35) 55%, rgba(7, 14, 22, 0.82) 100%), url(${HERO_BACKGROUND_IMAGE})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Brand glow overlays - using project colors */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(31,196,157,0.3),transparent_38%),radial-gradient(circle_at_85%_80%,rgba(31,82,123,0.35),transparent_38%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl px-5 py-36 sm:px-8 lg:px-10 lg:py-44">
        {/* Hero Content */}
        <div className="flex w-full flex-col justify-center">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.24em] text-brand-100 transition-all duration-700 ${
              isClient ? "opacity-100" : "opacity-0"
            }`}
            style={
              isClient
                ? {
                    animation: "fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                  }
                : {}
            }
          >
            Performance Mobility Platform
          </p>

          <h1
            className={`mt-5 max-w-2xl font-[var(--font-heading)] text-4xl font-bold leading-[1.02] text-white sm:text-5xl lg:text-6xl transition-all duration-700 ${
              isClient ? "opacity-100" : "opacity-0"
            }`}
            style={
              isClient
                ? {
                    animation: "fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                    animationDelay: "100ms",
                  }
                : {}
            }
          >
            Domina cada ruta. Mide cada ride.
          </h1>

          <p
            className={`mt-6 max-w-lg text-base leading-relaxed text-slate-200 sm:text-lg transition-all duration-700 ${
              isClient ? "opacity-100" : "opacity-0"
            }`}
            style={
              isClient
                ? {
                    animation: "fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                    animationDelay: "200ms",
                  }
                : {}
            }
          >
            APEX Ride convierte tus salidas en datos accionables: registra rutas,
            analiza segmentos y compite con tu comunidad rider.
          </p>

          <div
            className={`mt-9 flex flex-wrap gap-3 transition-all duration-700 ${
              isClient ? "opacity-100" : "opacity-0"
            }`}
            style={
              isClient
                ? {
                    animation: "fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                    animationDelay: "300ms",
                  }
                : {}
            }
          >
            <Link
              href="/register"
              className="focus-ring group inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-500 px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:bg-brand-400 hover:shadow-lg hover:shadow-brand-400/40 hover:scale-105"
            >
              Crear cuenta gratis
            </Link>
            <a
              href="#como-funciona"
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-white/45 px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-all duration-300 hover:border-white hover:bg-white/10"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
