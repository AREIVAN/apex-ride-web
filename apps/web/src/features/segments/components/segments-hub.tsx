"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { Input } from "@/features/shared/ui/input";
import type { LeaderboardRow, Segment } from "@/types/domain";

interface SegmentsHubProps {
  segments: Segment[];
  leaderboardBySegment: Record<string, LeaderboardRow[]>;
}

const FAVORITES_KEY = "apex:favorite-segments";

export function SegmentsHub({ segments, leaderboardBySegment }: SegmentsHubProps) {
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"all" | Segment["visibility"]>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [difficulty, setDifficulty] = useState<"all" | "low" | "mid" | "high">("all");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "distance">("popular");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as string[];
      setFavorites(Array.isArray(parsed) ? parsed : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  function toggleFavorite(segmentId: string) {
    setFavorites((current) => {
      const next = current.includes(segmentId) ? current.filter((id) => id !== segmentId) : [...current, segmentId];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  const filtered = useMemo(() => {
    const base = segments.filter((segment) => {
      const matchesQuery = segment.name.toLowerCase().includes(query.toLowerCase());
      const matchesVisibility = visibility === "all" ? true : segment.visibility === visibility;
      const matchesFavorites = favoritesOnly ? favorites.includes(segment.id) : true;
      const segmentDifficulty = segment.avgGradientPct >= 6 ? "high" : segment.avgGradientPct >= 3 ? "mid" : "low";
      const matchesDifficulty = difficulty === "all" ? true : segmentDifficulty === difficulty;
      return matchesQuery && matchesVisibility && matchesFavorites && matchesDifficulty;
    });

    return [...base].sort((a, b) => {
      if (sortBy === "distance") return b.distanceM - a.distanceM;
      if (sortBy === "popular") return (leaderboardBySegment[b.id]?.length ?? 0) - (leaderboardBySegment[a.id]?.length ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [segments, query, visibility, favoritesOnly, favorites, difficulty, sortBy, leaderboardBySegment]);

  if (!segments.length) {
    return (
      <EmptyState
        title="Aun no hay segmentos"
        description="Crea el primer segmento de tu comunidad para habilitar clasificaciones reales."
      />
    );
  }

  return (
    <section className="space-y-4">
      <Card className="space-y-3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <ChipMetric label="Segmentos activos" value={`${segments.length}`} />
          <ChipMetric label="Favoritos" value={`${favorites.length}`} />
          <ChipMetric
            label="Con ranking"
            value={`${segments.filter((segment) => (leaderboardBySegment[segment.id] ?? []).length > 0).length}`}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_170px_180px_190px]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar segmento"
            aria-label="Buscar segmento"
          />
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "all" | Segment["visibility"])}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
          >
            <option value="all">Todas las visibilidades</option>
            <option value="public">Publico</option>
            <option value="club">Club</option>
            <option value="private">Privado</option>
          </select>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as "all" | "low" | "mid" | "high")}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
          >
            <option value="all">Toda dificultad</option>
            <option value="low">Dificultad baja</option>
            <option value="mid">Dificultad media</option>
            <option value="high">Dificultad alta</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "recent" | "popular" | "distance")}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
          >
            <option value="popular">Orden: popularidad</option>
            <option value="recent">Orden: recientes</option>
            <option value="distance">Orden: mayor distancia</option>
          </select>
          <button
            type="button"
            onClick={() => setFavoritesOnly((value) => !value)}
            className={`focus-ring min-h-11 rounded-xl border px-3 text-sm font-semibold ${favoritesOnly ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-300 bg-white text-slate-700"}`}
          >
            {favoritesOnly ? "Solo favoritos" : "Ver todos"}
          </button>
        </div>
      </Card>

      {!filtered.length ? (
        <EmptyState
          title="No hay segmentos para ese filtro"
          description="Cambia la busqueda o visibilidad para descubrir mas rutas competitivas."
          compact
          action={<Button variant="secondary" onClick={() => { setQuery(""); setVisibility("all"); setFavoritesOnly(false); setDifficulty("all"); setSortBy("popular"); }}>Reiniciar filtros</Button>}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((segment) => {
            const rows = leaderboardBySegment[segment.id] ?? [];
            const top = rows[0];
            const isFavorite = favorites.includes(segment.id);
            const difficultyLabel = segment.avgGradientPct >= 6 ? "Alta" : segment.avgGradientPct >= 3 ? "Media" : "Baja";
            const popularity = rows.length >= 20 ? "Muy alta" : rows.length >= 8 ? "Alta" : rows.length >= 3 ? "Media" : "Nueva";

            return (
              <Card key={segment.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/segments/${segment.id}`} className="min-w-0 truncate text-base font-semibold text-slate-900 hover:text-brand-700">
                    {segment.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(segment.id)}
                    className={`focus-ring rounded-lg border px-2 py-1 text-xs font-semibold ${isFavorite ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {isFavorite ? "Favorito" : "Guardar"}
                  </button>
                </div>

                <p className="text-sm text-slate-600">{segment.description || "Segmento listo para competir y medir consistencia de trazada."}</p>

                <div className="grid gap-2 sm:grid-cols-4">
                  <TinyStat label="Distancia" value={`${(segment.distanceM / 1000).toFixed(2)} km`} />
                  <TinyStat label="Elevacion" value={`${segment.elevationGainM.toFixed(0)} m`} />
                  <TinyStat label="Pendiente" value={`${segment.avgGradientPct.toFixed(1)}%`} />
                  <TinyStat label="Dificultad" value={difficultyLabel} />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <TinyStat label="Popularidad" value={popularity} />
                  <TinyStat label="Intentos" value={`${rows.length}`} />
                  <TinyStat label="PB" value={top ? formatTime(top.elapsedTimeSec) : "Sin marca"} />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking asociado</p>
                  {top ? (
                    <p className="mt-1 text-sm text-slate-700">
                      Top actual: <span className="font-semibold text-slate-900">{top.riderName}</span> con {formatTime(top.elapsedTimeSec)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">Todavia sin intentos. Ideal para lanzar desafio interno.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/segments/${segment.id}`}><Button variant="secondary">Ver detalle</Button></Link>
                  <Link href="/leaderboards"><Button variant="ghost">Abrir clasificacion</Button></Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatTime(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function ChipMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TinyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
