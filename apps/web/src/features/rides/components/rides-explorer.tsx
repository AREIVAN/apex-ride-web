"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { Input } from "@/features/shared/ui/input";
import type { Ride } from "@/types/domain";

interface RidesExplorerProps {
  rides: Ride[];
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function RidesExplorer({ rides }: RidesExplorerProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Ride["status"]>("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "7d" | "30d" | "90d">("30d");
  const [sortBy, setSortBy] = useState<"recent" | "distance" | "speed">("recent");

  const filtered = useMemo(() => {
    const periodDays = periodFilter === "7d" ? 7 : periodFilter === "30d" ? 30 : periodFilter === "90d" ? 90 : 0;
    const threshold = periodDays ? Date.now() - periodDays * 24 * 60 * 60 * 1000 : 0;

    const base = rides.filter((ride) => {
      const matchesQuery = ride.title.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : ride.status === statusFilter;
      const matchesPeriod = periodFilter === "all" ? true : new Date(ride.startedAt).getTime() >= threshold;
      return matchesQuery && matchesStatus && matchesPeriod;
    });

    return [...base].sort((a, b) => {
      if (sortBy === "distance") return b.distanceKm - a.distanceKm;
      if (sortBy === "speed") {
        const speedA = a.movingTimeSec > 0 ? a.distanceKm / (a.movingTimeSec / 3600) : 0;
        const speedB = b.movingTimeSec > 0 ? b.distanceKm / (b.movingTimeSec / 3600) : 0;
        return speedB - speedA;
      }
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }, [rides, query, statusFilter, periodFilter, sortBy]);

  const totals = useMemo(() => {
    const distanceKm = filtered.reduce((acc, ride) => acc + ride.distanceKm, 0);
    const movingTimeSec = filtered.reduce((acc, ride) => acc + ride.movingTimeSec, 0);
    const avgSpeedKmh = movingTimeSec > 0 ? distanceKm / (movingTimeSec / 3600) : 0;
    const completed = filtered.filter((ride) => ride.status === "completed").length;
    return { distanceKm, movingTimeSec, avgSpeedKmh, completed };
  }, [filtered]);

  if (!rides.length) {
    return (
        <EmptyState
          title="Todavia no tenes salidas registradas"
          description="Inicia una rodada desde Grabar para comenzar a guardar trazas y estadisticas de moto."
          action={<Link href="/record"><Button>Iniciar primera rodada</Button></Link>}
        />
    );
  }

  return (
    <section className="space-y-4">
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Rodadas" value={`${filtered.length}`} />
          <Metric label="Completadas" value={`${totals.completed}`} />
          <Metric label="Distancia" value={`${totals.distanceKm.toFixed(1)} km`} />
          <Metric label="Velocidad media" value={`${totals.avgSpeedKmh.toFixed(1)} km/h`} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_190px]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por titulo de rodada"
            aria-label="Buscar rodada"
          />
          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value as "all" | "7d" | "30d" | "90d")}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
          >
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="90d">Ultimos 90 dias</option>
            <option value="all">Historico</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | Ride["status"])}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
          >
            <option value="all">Todos los estados</option>
            <option value="completed">Completadas</option>
            <option value="recording">En grabacion</option>
            <option value="draft">Borrador</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "recent" | "distance" | "speed")}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
          >
            <option value="recent">Orden: mas reciente</option>
            <option value="distance">Orden: mayor distancia</option>
            <option value="speed">Orden: mayor velocidad media</option>
          </select>
        </div>
      </Card>

      {!filtered.length ? (
        <EmptyState
          title="No encontramos rodadas con esos filtros"
          description="Proba otro termino de busqueda o cambia el estado para ver mas historial."
          compact
          action={<Button variant="secondary" onClick={() => { setQuery(""); setStatusFilter("all"); setPeriodFilter("30d"); setSortBy("recent"); }}>Limpiar filtros</Button>}
        />
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {filtered.map((ride) => (
              <Link key={ride.id} href={`/rides/${ride.id}`} className="block">
                <Card className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate text-base font-semibold text-slate-900">{ride.title}</h3>
                    <span className={`chip shrink-0 uppercase ${statusClassName(ride.status)}`}>{ride.status}</span>
                  </div>
                  <p className="text-xs text-slate-600">{new Date(ride.startedAt).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-700">
                    {ride.distanceKm.toFixed(1)} km · {ride.elevationGainM.toFixed(0)} m · {formatDuration(ride.movingTimeSec)}
                  </p>
                  <p className="text-xs font-semibold text-brand-800">{ride.status === "completed" ? "Lista para analisis completo" : "Sesion en progreso"}</p>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="hidden overflow-hidden p-0 sm:block">
            <div className="table-scroll">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Rodada</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Elevacion</th>
                    <th className="px-4 py-3">Distancia</th>
                    <th className="px-4 py-3">Tiempo</th>
                    <th className="px-4 py-3">Vel. prom.</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ride) => {
                    const avgSpeed = ride.movingTimeSec > 0 ? ride.distanceKm / (ride.movingTimeSec / 3600) : 0;
                    return (
                      <tr key={ride.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <Link href={`/rides/${ride.id}`} className="hover:text-brand-700">{ride.title}</Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{new Date(ride.startedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-slate-700">{ride.elevationGainM.toFixed(0)} m</td>
                        <td className="px-4 py-3 text-slate-700">{ride.distanceKm.toFixed(1)} km</td>
                        <td className="px-4 py-3 text-slate-700">{formatDuration(ride.movingTimeSec)}</td>
                        <td className="px-4 py-3 font-semibold text-brand-900">{avgSpeed.toFixed(1)} km/h</td>
                        <td className="px-4 py-3"><span className={`chip uppercase ${statusClassName(ride.status)}`}>{ride.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function statusClassName(status: Ride["status"]): string {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "recording") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-300 bg-slate-100 text-slate-700";
}
