import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/services/auth-server";
import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { MapContainer } from "@/features/maps/components/map-container";
import { createRidesService } from "@/features/rides/services/rides-service";
import { RideShareButton } from "@/features/rides/components/ride-share-button";
import { normalizeRideTrackPoints } from "@/features/rides/lib/normalize-ride-track-points";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { PageHeader } from "@/features/shared/ui/page-header";

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default async function RideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { client, user } = await requireUser();
  const { id } = await params;

  try {
    const ridesService = createRidesService(client);
    const [ride, points, attempts] = await Promise.all([
      ridesService.getById(id, user.id),
      ridesService.listPoints(id, user.id),
      ridesService.listAttemptsForRide(id, user.id)
    ]);

    if (!ride) notFound();

    const maxSpeed = points.reduce((acc, point) => Math.max(acc, Number(point.speedKmh ?? 0)), 0);
    const avgRecordedSpeed = points.length
      ? points.reduce((acc, point) => acc + Number(point.speedKmh ?? 0), 0) / points.length
      : ride.movingTimeSec > 0
        ? ride.distanceKm / (ride.movingTimeSec / 3600)
        : 0;
    const altitudeSamples = points.map((point) => point.altitudeM).filter((value): value is number => typeof value === "number");
    const minAltitude = altitudeSamples.length ? Math.min(...altitudeSamples) : 0;
    const maxAltitude = altitudeSamples.length ? Math.max(...altitudeSamples) : 0;
    const movingHours = ride.movingTimeSec > 0 ? ride.movingTimeSec / 3600 : 0;
    const climbRate = movingHours > 0 ? ride.elevationGainM / movingHours : 0;

    const validAttempts = attempts.filter((attempt) => attempt.elapsedTimeSec >= 20 && attempt.elapsedTimeSec <= 3600);
    const flaggedAttempts = attempts.filter((attempt) => !validAttempts.some((valid) => valid.id === attempt.id));

    const speedBuckets = points.reduce(
      (acc, point) => {
        const speed = Number(point.speedKmh ?? 0);
        if (speed < 30) acc.control += 1;
        else if (speed < 55) acc.cruise += 1;
        else acc.attack += 1;
        return acc;
      },
      { control: 0, cruise: 0, attack: 0 }
    );
    const totalBuckets = speedBuckets.control + speedBuckets.cruise + speedBuckets.attack;
    const normalizedPoints = normalizeRideTrackPoints(points);
    const routeCoordinates = normalizedPoints.map((point) => [point.lng, point.lat] as [number, number]);
    const shareData = {
      title: ride.title,
      startedAt: ride.startedAt,
      endedAt: ride.endedAt,
      distanceKm: ride.distanceKm,
      movingTimeSec: ride.movingTimeSec,
      avgSpeedKmh: avgRecordedSpeed,
      maxSpeedKmh: maxSpeed,
      elevationGainM: ride.elevationGainM,
      pointCount: normalizedPoints.length,
      routeCoordinates
    };

    const speedStdDeviation = points.length
      ? Math.sqrt(
          points.reduce((acc, point) => {
            const speed = Number(point.speedKmh ?? 0);
            return acc + Math.pow(speed - avgRecordedSpeed, 2);
          }, 0) / points.length
        )
      : 0;
    const attemptsPerHour = movingHours > 0 ? validAttempts.length / movingHours : 0;
    const consistencyScore = Math.max(0, Math.round(100 - speedStdDeviation * 1.8));

    const midpoint = points[Math.floor(points.length * 0.5)];

    const timeline = [
      { label: "Inicio", value: new Date(ride.startedAt).toLocaleString() },
      { label: "50% recorrido", value: midpoint?.capturedAt ? new Date(midpoint.capturedAt).toLocaleString() : "No disponible" },
      { label: "Cierre", value: ride.endedAt ? new Date(ride.endedAt).toLocaleString() : "En progreso" },
      { label: "Intentos detectados", value: `${attempts.length} total (${validAttempts.length} validos)` }
    ];

    return (
      <div className="space-y-4">
        <PageHeader
          title={ride.title}
          description="Vista analitica integral de la rodada con bloques de rendimiento, intentos de segmentos y timeline operativo."
          actions={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <RideShareButton data={shareData} />
              <Link href="/rides"><Button variant="secondary">Volver al historial</Button></Link>
              <Link href="/leaderboards"><Button variant="ghost">Ver clasificaciones</Button></Link>
            </div>
          }
        />

        <Card className="space-y-4 border-brand-200/70 bg-gradient-to-br from-white/95 via-brand-50/50 to-white/95 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hero de metricas</p>
              <h3 className="text-xl font-bold text-slate-900">Rendimiento principal de la sesion</h3>
            </div>
            <span className={`chip ${ride.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {ride.status === "completed" ? "Completada" : "En progreso"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Distancia" value={`${ride.distanceKm.toFixed(1)} km`} />
            <Metric label="Tiempo efectivo" value={formatDuration(ride.movingTimeSec)} />
            <Metric label="Velocidad media" value={`${avgRecordedSpeed.toFixed(1)} km/h`} />
            <Metric label="Velocidad maxima" value={`${maxSpeed.toFixed(1)} km/h`} />
            <Metric label="Elevacion" value={`${ride.elevationGainM.toFixed(0)} m`} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <QuickInsight label="Puntos GPS" value={`${normalizedPoints.length}`} helper="Muestra disponible para replay" />
            <QuickInsight label="Ritmo de ascenso" value={`${climbRate.toFixed(0)} m/h`} helper="Promedio sobre tiempo en movimiento" />
            <QuickInsight label="Ventana altitud" value={`${minAltitude.toFixed(0)} - ${maxAltitude.toFixed(0)} m`} helper="Rango vertical de la rodada" />
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <MapContainer
            title="Traza de la rodada"
            useUserLocation={routeCoordinates.length === 0}
            routeCoordinates={routeCoordinates}
          />

          <Card className="space-y-3 p-4 sm:p-5">
            <h3 className="text-base font-semibold text-slate-900">Bloques analiticos</h3>
            <p className="text-sm text-slate-600">Distribucion de esfuerzo por muestras de velocidad para lectura rapida de la sesion.</p>
            <div className="space-y-2">
              <SpeedBar label="Control (<30 km/h)" count={speedBuckets.control} total={totalBuckets} tone="bg-slate-700" />
              <SpeedBar label="Cruise (30-55 km/h)" count={speedBuckets.cruise} total={totalBuckets} tone="bg-brand-700" />
              <SpeedBar label="Ataque (>55 km/h)" count={speedBuckets.attack} total={totalBuckets} tone="bg-emerald-600" />
            </div>
            <div className="grid gap-2 pt-1 sm:grid-cols-3">
              <QuickInsight
                label="Consistencia"
                value={`${consistencyScore}%`}
                helper={speedStdDeviation > 0 ? `Desvio de velocidad ${speedStdDeviation.toFixed(1)} km/h` : "Aun sin datos suficientes"}
              />
              <QuickInsight
                label="Ritmo de intentos"
                value={`${attemptsPerHour.toFixed(1)} /h`}
                helper="Intentos validos por hora efectiva"
              />
              <QuickInsight
                label="Cobertura GPS"
                value={routeCoordinates.length >= 2 ? `${routeCoordinates.length} puntos` : "Sin traza"}
                helper={routeCoordinates.length >= 2 ? "Traza disponible en mapa" : "Revisar permisos de ubicacion en la grabacion"}
              />
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card className="space-y-3 p-4 sm:p-5">
            <h3 className="text-base font-semibold text-slate-900">Timeline e hitos</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {timeline.map((item) => (
                <TimelineItem key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Esta vista ya muestra trazabilidad operativa completa con ruta, hitos y calidad de intentos para demo comercial.
            </p>
          </Card>

          <Card className="space-y-3 p-4 sm:p-5">
            <h3 className="text-base font-semibold text-slate-900">Segmentos detectados</h3>
            <p className="text-sm text-slate-600">{attempts.length} intento(s) detectado(s) en esta rodada.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Validos</p>
                <p className="mt-1 text-xl font-bold text-emerald-800">{validAttempts.length}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Revisar</p>
                <p className="mt-1 text-xl font-bold text-amber-800">{flaggedAttempts.length}</p>
              </div>
            </div>
            <div className="pt-1">
              <Link href="/leaderboards"><Button variant="secondary" className="w-full">Ir a clasificaciones de segmentos</Button></Link>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-white/70 px-4 py-3">
            <h3 className="text-base font-semibold text-slate-900">Intentos detectados</h3>
          </div>
          {!attempts.length ? (
            <div className="p-4">
              <EmptyState
                title="Sin intentos en segmentos"
                description="Selecciona segmentos desde Grabar para habilitar validaciones en este panel."
                compact
                action={<Link href="/record"><Button variant="secondary">Ir a Grabar</Button></Link>}
              />
            </div>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Segmento</th>
                    <th className="px-4 py-3">Tiempo</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => {
                    const isValid = validAttempts.some((valid) => valid.id === attempt.id);
                    return (
                      <tr key={attempt.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-900">{attempt.segmentName}</td>
                        <td className="px-4 py-3 font-semibold text-brand-900">{formatDuration(attempt.elapsedTimeSec)}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(attempt.recordedAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`chip ${isValid ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                            {isValid ? "Valido" : "No valido"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el detalle de la rodada.";
    return <EmptyState title="Detalle sin datos" description={message} />;
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

function QuickInsight({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600">{helper}</p>
    </div>
  );
}

function SpeedBar({ label, count, total, tone }: { label: string; count: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
