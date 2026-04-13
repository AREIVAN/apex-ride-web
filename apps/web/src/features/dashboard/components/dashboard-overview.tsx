import Link from "next/link";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";

interface DashboardOverviewProps {
  periods: {
    day: { rides: number; distanceKm: number; elevationM: number };
    week: { rides: number; distanceKm: number; elevationM: number };
    month: { rides: number; distanceKm: number; elevationM: number };
  };
  comparisons: {
    week: { ridesDeltaPct: number; distanceDeltaPct: number; elevationDeltaPct: number };
    month: { ridesDeltaPct: number; distanceDeltaPct: number; elevationDeltaPct: number };
  };
  recentAttempts: number;
  recentRides: Array<{
    id: string;
    title: string;
    startedAt: string;
    distanceKm: number;
    movingTimeSec: number;
    elevationGainM: number;
  }>;
  latestAttempts: Array<{
    segmentId: string;
    segmentName: string;
    elapsedTimeSec: number;
    recordedAt: string;
  }>;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function formatAttempt(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.max(0, seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function trendLabel(value: number): string {
  if (value > 0) return `+${value}% vs periodo anterior`;
  if (value < 0) return `${value}% vs periodo anterior`;
  return "Sin variacion vs periodo anterior";
}

export function DashboardOverview({ periods, comparisons, recentAttempts, recentRides, latestAttempts }: DashboardOverviewProps) {
  const weeklyGoalKm = 180;
  const weeklyGoalRides = 4;
  const progress = Math.min(100, Math.round((periods.week.distanceKm / weeklyGoalKm) * 100));
  const ridesProgress = Math.min(100, Math.round((periods.week.rides / weeklyGoalRides) * 100));
  const averageRideDistance = periods.month.rides > 0 ? periods.month.distanceKm / periods.month.rides : 0;
  const bestAttempt = latestAttempts.reduce((best, current) => {
    if (!best) return current;
    return current.elapsedTimeSec < best.elapsedTimeSec ? current : best;
  }, latestAttempts[0]);
  const consistentPace = averageRideDistance >= 30 ? "Alta" : averageRideDistance >= 18 ? "Media" : "Baja";

  const kpis = [
    {
      label: "Semana",
      distance: periods.week.distanceKm,
      rides: periods.week.rides,
      elevation: periods.week.elevationM,
      trend: trendLabel(comparisons.week.distanceDeltaPct)
    },
    {
      label: "Mes",
      distance: periods.month.distanceKm,
      rides: periods.month.rides,
      elevation: periods.month.elevationM,
      trend: trendLabel(comparisons.month.distanceDeltaPct)
    }
  ];

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Centro de mando</p>
              <h3 className="text-xl font-bold text-slate-900">Ritmo operativo semanal</h3>
            </div>
            <span className="chip">{recentAttempts} intentos en 7 dias</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {kpis.map((kpi) => (
              <article key={kpi.label} className="rounded-xl border border-slate-200/80 bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{kpi.distance.toFixed(1)} km</p>
                <p className="text-xs text-slate-600">{kpi.rides} rodadas · {kpi.elevation.toFixed(0)} m</p>
                <p className="mt-1 text-xs font-semibold text-brand-800">{kpi.trend}</p>
              </article>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-brand-200/70 bg-brand-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Objetivo semanal</p>
              <p className="text-sm font-bold text-brand-900">{periods.week.distanceKm.toFixed(1)} / {weeklyGoalKm} km</p>
            </div>
            <div className="h-2 w-full rounded-full bg-brand-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-700">
              <span>{progress}% de distancia completado</span>
              <span>{periods.week.rides}/{weeklyGoalRides} sesiones</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-gradient-to-r from-slate-600 to-slate-800" style={{ width: `${ridesProgress}%` }} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/record"><Button className="w-full">Iniciar rodada</Button></Link>
            <Link href="/rides"><Button variant="secondary" className="w-full">Ver historial</Button></Link>
            <Link href="/segments"><Button variant="ghost" className="w-full">Explorar segmentos</Button></Link>
          </div>
        </Card>

        <Card className="space-y-3 p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-900">Lectura rapida</p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="rounded-lg bg-slate-50 px-3 py-2">Hoy: {periods.day.distanceKm.toFixed(1)} km en {periods.day.rides} salida(s).</li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">Promedio por rodada del mes: {averageRideDistance.toFixed(1)} km.</li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">Consistencia de fondo: {consistentPace} en el ultimo ciclo.</li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">Variacion de rodadas semanales: {trendLabel(comparisons.week.ridesDeltaPct)}.</li>
          </ul>
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">PB del periodo</p>
            <p className="mt-1 text-sm text-slate-700">
              {bestAttempt ? `${bestAttempt.segmentName} en ${formatAttempt(bestAttempt.elapsedTimeSec)}.` : "Sin PB reciente. Configura un segmento para activar referencias."}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Actividad reciente</h4>
            <Link href="/rides" className="text-xs font-semibold text-brand-700">Abrir todas</Link>
          </div>
          {recentRides.length ? (
            <div className="space-y-2">
              {recentRides.map((ride) => (
                <Link key={ride.id} href={`/rides/${ride.id}`} className="block rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 hover:border-brand-300">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{ride.title}</p>
                    <span className="chip shrink-0">{ride.distanceKm.toFixed(1)} km</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{new Date(ride.startedAt).toLocaleDateString()} · {formatDuration(ride.movingTimeSec)} · {ride.elevationGainM.toFixed(0)} m</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">Todavia no hay rodadas cerradas para mostrar actividad. Inicia una salida desde Grabar.</p>
          )}
        </Card>

        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">PB recientes y segmentos</h4>
            <Link href="/leaderboards" className="text-xs font-semibold text-brand-700">Ver clasificacion</Link>
          </div>
          {latestAttempts.length ? (
            <div className="space-y-2">
              {latestAttempts.map((attempt) => (
                <article key={`${attempt.segmentId}-${attempt.recordedAt}`} className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{attempt.segmentName}</p>
                    <span className="text-sm font-bold text-brand-900">{formatAttempt(attempt.elapsedTimeSec)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Intento registrado el {new Date(attempt.recordedAt).toLocaleDateString()}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">Sin intentos recientes. Usa Grabar y selecciona un segmento para aparecer en la clasificacion.</p>
          )}
        </Card>
      </div>
    </section>
  );
}
