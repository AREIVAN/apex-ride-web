import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/services/auth-server";
import { LeaderboardTable } from "@/features/leaderboard/components/leaderboard-table";
import { createLeaderboardService } from "@/features/leaderboard/services/leaderboard-service";
import { MapContainer } from "@/features/maps/components/map-container";
import { SegmentCard } from "@/features/segments/components/segment-card";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { EmptyState } from "@/features/shared/ui/empty-state";

export default async function SegmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireUser();
  const { id } = await params;

  try {
    const [segment, leaderboardRows] = await Promise.all([
      createSegmentsService(client).getById(id),
      createLeaderboardService(client).bySegment(id)
    ]);

    if (!segment) notFound();

    return (
      <div className="space-y-4">
        <SegmentCard segment={segment} />
        <MapContainer title="Trazado del segmento" />
        {leaderboardRows.length ? (
          <LeaderboardTable rows={leaderboardRows} />
        ) : (
          <EmptyState
            title="Sin intentos todavia"
            description="Todavia nadie completo este segmento. Compartilo para empezar la competencia."
          />
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el detalle del segmento.";
    return <EmptyState title="Segmento sin datos" description={message} />;
  }
}
