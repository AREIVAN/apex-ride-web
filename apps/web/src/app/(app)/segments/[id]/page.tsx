import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/services/auth-server";
import { LeaderboardTable } from "@/features/leaderboard/components/leaderboard-table";
import { createLeaderboardService } from "@/features/leaderboard/services/leaderboard-service";
import { MapContainer } from "@/features/maps/components/map-container";
import { Card } from "@/features/shared/ui/card";
import { SegmentCard } from "@/features/segments/components/segment-card";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { PageHeader } from "@/features/shared/ui/page-header";
import { Button } from "@/features/shared/ui/button";
import Link from "next/link";

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default async function SegmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { client, user } = await requireUser();
  const { id } = await params;

  try {
    const [segment, leaderboardRows] = await Promise.all([
      createSegmentsService(client).getById(id),
      createLeaderboardService(client).bySegment(id)
    ]);

    if (!segment) notFound();

    const segmentCoordinates: [number, number][] =
      segment.pathCoordinates && segment.pathCoordinates.length >= 2
        ? segment.pathCoordinates
        : [
            [segment.startLng, segment.startLat],
            [segment.endLng, segment.endLat]
          ];
    
    const userRows = leaderboardRows.filter((row) => row.riderId === user.id);
    const pb = userRows.length ? userRows.reduce((best, row) => (row.elapsedTimeSec < best.elapsedTimeSec ? row : best), userRows[0]) : null;
    const avgUserElapsed = userRows.length
      ? Math.round(userRows.reduce((acc, row) => acc + row.elapsedTimeSec, 0) / userRows.length)
      : null;
    const deltaVsPb = pb && avgUserElapsed ? avgUserElapsed - pb.elapsedTimeSec : null;

    return (
      <div className="space-y-4">
        <PageHeader
          title={segment.name}
          description="Detalle del segmento con lectura de dificultad, trazado y ranking operativo."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Distancia</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{(segment.distanceM / 1000).toFixed(2)} km</p>
          </Card>
          <Card className="p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pendiente media</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{segment.avgGradientPct.toFixed(1)}%</p>
          </Card>
          <Card className="p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nivel</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{segment.avgGradientPct >= 6 ? "Exigente" : segment.avgGradientPct >= 3 ? "Intermedio" : "Accesible"}</p>
          </Card>
        </div>
        <Card className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <PerformanceMetric label="PB personal" value={pb ? formatDuration(pb.elapsedTimeSec) : "Sin marca"} helper={pb ? `Ranking actual #${pb.rank}` : "Completalo desde Grabar para aparecer en ranking"} />
          <PerformanceMetric label="Intentos registrados" value={`${userRows.length}`} helper={userRows.length ? "Historial personal en este segmento" : "Aun no hay intentos propios"} />
          <PerformanceMetric label="Ritmo medio" value={avgUserElapsed ? formatDuration(avgUserElapsed) : "Sin datos"} helper={deltaVsPb !== null ? `${deltaVsPb <= 0 ? "" : "+"}${deltaVsPb}s vs PB` : "Se calcula desde tus intentos"} />
        </Card>
        <SegmentCard segment={segment} />
        <MapContainer title="Trazado del segmento" segmentCoordinates={segmentCoordinates} useUserLocation={false} />
        {leaderboardRows.length ? (
          <LeaderboardTable rows={leaderboardRows} />
        ) : (
          <EmptyState
            title="Sin intentos todavia"
            description="Todavia nadie completo este segmento. Compartilo para empezar la competencia."
            action={<Link href="/record"><Button variant="secondary">Intentar segmento</Button></Link>}
          />
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el detalle del segmento.";
    return <EmptyState title="Segmento sin datos" description={message} />;
  }
}

function PerformanceMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600">{helper}</p>
    </div>
  );
}
