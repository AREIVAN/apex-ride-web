"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { HERO_BACKGROUND_IMAGE } from "@/features/home/config/landing-content";

interface MetricChip {
  icon: string;
  label: string;
  delay: number;
}

const METRIC_CHIPS: MetricChip[] = [
  { icon: "⚡", label: "Velocidad", delay: 0 },
  { icon: "◈", label: "Segmento", delay: 100 },
  { icon: "🛣️", label: "Distancia", delay: 200 },
  { icon: "🏆", label: "Leaderboard", delay: 300 },
];

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

      <div className="relative z-10 mx-auto flex w-full max-w-7xl gap-8 px-5 py-36 sm:px-8 lg:px-10 lg:py-44">
        {/* Left Column - 40% Content */}
        <div className="flex w-full flex-col justify-center lg:w-2/5">
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

        {/* Right Column - Floating Metric Chips */}
        <div className="hidden w-3/5 lg:flex items-center justify-center">
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {METRIC_CHIPS.map((chip) => (
              <div
                key={chip.label}
                className={`flex flex-col items-center gap-2 rounded-2xl border border-brand-400/30 bg-brand-500/10 p-6 backdrop-blur-sm transition-all duration-500 hover:border-brand-400/60 hover:bg-brand-500/20 ${
                  isClient ? "opacity-100" : "opacity-0"
                }`}
                style={
                  isClient
                    ? {
                        animation: `slideInFromRight 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                        animationDelay: `${chip.delay + 200}ms`,
                      }
                    : {}
                }
              >
                <span className="text-3xl">{chip.icon}</span>
                <span className="text-center text-sm font-medium text-brand-100">
                  {chip.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
