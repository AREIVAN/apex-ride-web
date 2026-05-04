"use client";

import { useEffect, useMemo, useState } from "react";

import type { RecordingPanelState } from "./recording-panel";

interface RideHudProps {
  rideState: RecordingPanelState;
  plannedDistanceM?: number | null;
  /** Direct remaining distance calculation for planned routes */
  remainingDistanceM?: number | null;
}

export function RideHud({ rideState, plannedDistanceM, remainingDistanceM }: RideHudProps) {
  const [now, setNow] = useState(() => new Date());
  const { metrics, segmentSnapshot } = rideState;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const routeSummary = useMemo(() => {
    const hasPlannedRoute = typeof plannedDistanceM === "number" && plannedDistanceM > 0;
    
    if (!hasPlannedRoute) {
      return {
        label: "Sin ruta",
        primary: formatDistance(metrics.distanceM),
        secondary: "recorridos",
      };
    }

    // Use direct remaining distance if provided (from planned route), otherwise use segment distance
    const remainingM = (remainingDistanceM !== undefined && remainingDistanceM !== null)
      ? remainingDistanceM 
      : Math.max(0, segmentSnapshot?.distanceToEndM ?? plannedDistanceM);
    const eta = estimateEta(remainingM, metrics.speedKmh);

    return {
      label: "Restante",
      primary: formatDistance(remainingM),
      secondary: eta ? `ETA ${eta}` : "ETA --",
    };
  }, [metrics.distanceM, metrics.speedKmh, plannedDistanceM, remainingDistanceM, segmentSnapshot?.distanceToEndM]);

  return (
    <section className="pointer-events-auto w-full rounded-[26px] border border-white/10 bg-[rgba(10,15,25,0.94)] px-4 py-3 text-white shadow-[0_22px_54px_rgba(0,0,0,0.55),0_4px_14px_rgba(0,0,0,0.35)] sm:px-5 landscape:rounded-[24px] landscape:px-4 landscape:py-2">
      <div className="flex min-w-0 items-end justify-between gap-3 landscape:items-center">
        <div className="min-w-[116px] shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">Velocidad</p>
          <div className="mt-0.5 flex items-end gap-2">
            <span className="tabular-nums text-6xl font-black leading-none tracking-[-0.08em] text-white sm:text-7xl landscape:text-[3.5rem]">
              {Math.round(metrics.speedKmh)}
            </span>
            <span className="pb-1.5 text-sm font-black uppercase tracking-[0.06em] text-white landscape:pb-1">km/h</span>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1 text-right landscape:grid-cols-3 landscape:text-center">
          <HudMetric label="Hora" value={formatClock(now)} />
          <HudMetric label="Distancia" value={formatDistance(metrics.distanceM)} />
          <HudMetric className="col-span-2 landscape:col-span-1" label={routeSummary.label} value={routeSummary.primary} helper={routeSummary.secondary} />
        </div>
      </div>

      <div className="mt-2 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-2 text-[11px] font-semibold text-slate-300 landscape:mt-1.5 landscape:pt-1.5">
        <span className="truncate">{rideState.gpsStatus} · Precisión {rideState.precisionStatus}</span>
        <span className="shrink-0 tabular-nums">Máx {Math.round(metrics.maxSpeedKmh)} km/h</span>
      </div>
    </section>
  );
}

function HudMetric({
  label,
  value,
  helper,
  className,
}: {
  label: string;
  value: string;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-0.5 whitespace-nowrap text-sm font-black tabular-nums text-white sm:text-base landscape:text-sm">{value}</p>
      {helper ? <p className="whitespace-nowrap text-[10px] font-semibold text-slate-300">{helper}</p> : null}
    </div>
  );
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatDistance(distanceM: number): string {
  if (!Number.isFinite(distanceM)) return "--";
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} km`;
  return `${Math.max(0, Math.round(distanceM))} m`;
}

function estimateEta(distanceM: number, speedKmh: number): string | null {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return "0 min";
  if (!Number.isFinite(speedKmh) || speedKmh < 3) return null;

  const minutes = Math.ceil(distanceM / (speedKmh * 1000 / 60));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
