"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { EmptyState } from "@/features/shared/ui/empty-state";
import type { LeaderboardRow, Segment } from "@/types/domain";

interface LeaderboardsHubProps {
  segments: Segment[];
  leaderboardBySegment: Record<string, LeaderboardRow[]>;
  userId: string;
}

type Scope = "global" | "segment";
type Period = "7d" | "30d" | "all";

interface GlobalRow {
  rank: number;
  riderId: string;
  riderName: string;
  bestTime: number;
  segments: number;
  freshness: string;
}

export function LeaderboardsHub({ segments, leaderboardBySegment, userId }: LeaderboardsHubProps) {
  const [scope, setScope] = useState<Scope>("global");
  const [period, setPeriod] = useState<Period>("30d");
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id ?? "");

  const windows = useMemo(() => periodWindows(period), [period]);

  const filteredByPeriod = useMemo(() => {
    const bySegment: Record<string, LeaderboardRow[]> = {};

    for (const segment of segments) {
      bySegment[segment.id] = (leaderboardBySegment[segment.id] ?? []).filter((row) => {
        if (period === "all" || !windows.currentStart) return true;
        return new Date(row.recordedAt).getTime() >= windows.currentStart;
      });
    }

    return bySegment;
  }, [period, segments, leaderboardBySegment, windows.currentStart]);

  const previousByPeriod = useMemo(() => {
    const bySegment: Record<string, LeaderboardRow[]> = {};

    for (const segment of segments) {
      bySegment[segment.id] = (leaderboardBySegment[segment.id] ?? []).filter((row) => {
        if (period === "all" || !windows.currentStart || !windows.previousStart) return false;
        const timestamp = new Date(row.recordedAt).getTime();
        return timestamp >= windows.previousStart && timestamp < windows.currentStart;
      });
    }

    return bySegment;
  }, [period, segments, leaderboardBySegment, windows.currentStart, windows.previousStart]);

  const globalRows = useMemo(() => createGlobalRows(filteredByPeriod, segments), [filteredByPeriod, segments]);
  const previousGlobalRows = useMemo(() => createGlobalRows(previousByPeriod, segments), [previousByPeriod, segments]);
  const previousGlobalRankByRider = useMemo(() => rankMap(previousGlobalRows), [previousGlobalRows]);

  const selectedRows = useMemo(() => {
    if (!selectedSegmentId) return [];
    return filteredByPeriod[selectedSegmentId] ?? [];
  }, [filteredByPeriod, selectedSegmentId]);

  const previousSegmentRankByRider = useMemo(() => {
    if (!selectedSegmentId) return new Map<string, number>();
    return rankMap(previousByPeriod[selectedSegmentId] ?? []);
  }, [selectedSegmentId, previousByPeriod]);

  const userGlobalRow = globalRows.find((row) => row.riderId === userId) ?? null;
  const userSegmentRow = selectedRows.find((row) => row.riderId === userId) ?? null;

  if (!segments.length) {
    return (
      <EmptyState
        title="Aun no hay segmentos publicados"
        description="Crea segmentos para habilitar clasificaciones entre motociclistas."
        action={<Link href="/segments"><Button variant="secondary">Ir a Segmentos</Button></Link>}
      />
    );
  }

  return (
    <section className="space-y-4">
      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Toggle active={scope === "global"} onClick={() => setScope("global")}>Clasificacion global</Toggle>
          <Toggle active={scope === "segment"} onClick={() => setScope("segment")}>Por segmento</Toggle>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className="focus-ring min-h-11 rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
          >
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="all">Historico</option>
          </select>
          {scope === "segment" ? (
            <select
              value={selectedSegmentId}
              onChange={(event) => setSelectedSegmentId(event.target.value)}
              className="focus-ring min-h-11 rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
            >
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>{segment.name}</option>
              ))}
            </select>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SpotlightMetric
          label="Tu posicion global"
          value={userGlobalRow ? `#${userGlobalRow.rank}` : "Sin posicion"}
          helper={userGlobalRow ? userGlobalRow.riderName : "Registra intentos para entrar a la clasificacion"}
        />
        <SpotlightMetric
          label="Tendencia global"
          value={trendText(userGlobalRow ? userGlobalRow.rank : null, userGlobalRow ? previousGlobalRankByRider.get(userGlobalRow.riderId) ?? null : null, period)}
          helper={period === "all" ? "Sin comparativa de periodo" : "Comparado contra ventana anterior"}
        />
        <SpotlightMetric
          label="Tu posicion en segmento"
          value={userSegmentRow ? `#${userSegmentRow.rank}` : "Sin marca"}
          helper={scope === "segment" ? (segments.find((segment) => segment.id === selectedSegmentId)?.name ?? "-") : "Activa vista por segmento"}
        />
        <SpotlightMetric
          label="Competidores activos"
          value={`${scope === "global" ? globalRows.length : selectedRows.length}`}
          helper="Participantes visibles segun filtros"
        />
      </div>

      {scope === "global" ? (
        <Card className="overflow-hidden p-0">
          <TableHeader title="Clasificacion global por segmentos" subtitle="Tabla extendida para demo comercial, con tendencia y brecha contra el lider." />
          {!globalRows.length ? (
            <div className="p-4">
              <EmptyState
                title="No hay registros para este periodo"
                description="Cambia a historico o registra una rodada para activar la clasificacion."
                compact
                action={(
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="secondary" onClick={() => setPeriod("all")}>Ver historico</Button>
                    <Link href="/record"><Button>Ir a Grabar</Button></Link>
                  </div>
                )}
              />
            </div>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Participante</th>
                    <th className="px-4 py-3">Mejor tiempo</th>
                    <th className="px-4 py-3">Segmentos</th>
                    <th className="px-4 py-3">Brecha lider</th>
                    <th className="px-4 py-3">Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {globalRows.map((row) => {
                    const isUser = row.riderId === userId;
                    const leaderTime = globalRows[0]?.bestTime ?? row.bestTime;
                    const gap = row.bestTime - leaderTime;
                    const previousRank = previousGlobalRankByRider.get(row.riderId) ?? null;

                    return (
                      <tr key={row.riderId} className={`border-t border-slate-100 ${isUser ? "bg-brand-50/60" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.rank}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.riderName}{isUser ? " (vos)" : ""}</td>
                        <td className="px-4 py-3 font-semibold text-brand-900">{formatTime(row.bestTime)}</td>
                        <td className="px-4 py-3 text-slate-700">{row.segments}</td>
                        <td className="px-4 py-3 text-slate-700">{gap > 0 ? `+${formatTime(gap)}` : "Lider"}</td>
                        <td className="px-4 py-3 text-slate-700">{trendText(row.rank, previousRank, period)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <TableHeader
            title={`Clasificacion por segmento: ${segments.find((segment) => segment.id === selectedSegmentId)?.name ?? "-"}`}
            subtitle="Tu posicion aparece destacada. Incluye tendencia por periodo para lectura comercial clara."
          />
          {!selectedRows.length ? (
            <div className="p-4">
              <EmptyState
                title="Segmento sin registros"
                description="No hay intentos para el periodo seleccionado. Proba otra ventana o registra una rodada."
                compact
                action={(
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="secondary" onClick={() => setPeriod("all")}>Ver historico</Button>
                    <Link href="/record"><Button>Ir a Grabar</Button></Link>
                  </div>
                )}
              />
            </div>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Participante</th>
                    <th className="px-4 py-3">Tiempo</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Brecha lider</th>
                    <th className="px-4 py-3">Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row) => {
                    const isUser = row.riderId === userId;
                    const leaderTime = selectedRows[0]?.elapsedTimeSec ?? row.elapsedTimeSec;
                    const previousRank = previousSegmentRankByRider.get(row.riderId) ?? null;

                    return (
                      <tr key={`${row.segmentId}-${row.riderId}`} className={`border-t border-slate-100 ${isUser ? "bg-brand-50/60" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.rank}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.riderName}{isUser ? " (vos)" : ""}</td>
                        <td className="px-4 py-3 font-semibold text-brand-900">{formatTime(row.elapsedTimeSec)}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(row.recordedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-slate-700">{row.rank === 1 ? "Lider" : `+${formatTime(row.elapsedTimeSec - leaderTime)}`}</td>
                        <td className="px-4 py-3 text-slate-700">{trendText(row.rank, previousRank, period)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

function createGlobalRows(bySegment: Record<string, LeaderboardRow[]>, segments: Segment[]): GlobalRow[] {
  const bestByRider = new Map<string, Omit<GlobalRow, "rank">>();

  for (const segment of segments) {
    for (const row of bySegment[segment.id] ?? []) {
      const current = bestByRider.get(row.riderId);
      if (!current || row.elapsedTimeSec < current.bestTime) {
        bestByRider.set(row.riderId, {
          riderId: row.riderId,
          riderName: row.riderName,
          bestTime: row.elapsedTimeSec,
          segments: current ? current.segments + 1 : 1,
          freshness: row.recordedAt
        });
      } else {
        current.segments += 1;
      }
    }
  }

  return Array.from(bestByRider.values())
    .sort((a, b) => a.bestTime - b.bestTime)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function periodWindows(period: Period): { currentStart: number | null; previousStart: number | null } {
  if (period === "all") return { currentStart: null, previousStart: null };
  const days = period === "7d" ? 7 : 30;
  const currentStart = Date.now() - days * 24 * 60 * 60 * 1000;
  const previousStart = Date.now() - days * 2 * 24 * 60 * 60 * 1000;
  return { currentStart, previousStart };
}

function rankMap(rows: Array<{ riderId: string; rank: number }>): Map<string, number> {
  return rows.reduce((acc, row) => {
    acc.set(row.riderId, row.rank);
    return acc;
  }, new Map<string, number>());
}

function trendText(currentRank: number | null, previousRank: number | null, period: Period): string {
  if (period === "all") return "Sin comparativa";
  if (!currentRank) return "Sin posicion";
  if (!previousRank) return "Nuevo";
  if (currentRank < previousRank) return `Sube ${previousRank - currentRank}`;
  if (currentRank > previousRank) return `Baja ${currentRank - previousRank}`;
  return "Estable";
}

function formatTime(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring min-h-11 rounded-xl border px-3.5 text-sm font-semibold ${active ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-300 bg-white text-slate-700"}`}
    >
      {children}
    </button>
  );
}

function TableHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-slate-200 bg-white/70 px-4 py-3">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}

function SpotlightMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600">{helper}</p>
    </div>
  );
}
