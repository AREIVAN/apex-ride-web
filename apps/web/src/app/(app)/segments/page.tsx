import Link from "next/link";

import { requireUser } from "@/features/auth/services/auth-server";
import { createLeaderboardService } from "@/features/leaderboard/services/leaderboard-service";
import { SegmentsHub } from "@/features/segments/components/segments-hub";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { Button } from "@/features/shared/ui/button";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { PageHeader } from "@/features/shared/ui/page-header";

export default async function SegmentsPage() {
  const { client } = await requireUser();

  try {
    const segments = await createSegmentsService(client).listPublic();
    const leaderboardBySegment = await createLeaderboardService(client).bySegments(segments.map((segment) => segment.id));

    return (
      <div className="space-y-4">
        <PageHeader
          title="Segmentos"
          description="Modulo central para descubrir rutas, marcar favoritas y leer su valor competitivo en un vistazo."
          actions={
            <Link href="/segments/create">
              <Button>Nuevo segmento</Button>
            </Link>
          }
        />

        {segments.length ? <SegmentsHub segments={segments} leaderboardBySegment={leaderboardBySegment} /> : (
          <EmptyState
            title="Aun no hay segmentos"
            description="Crea el primer segmento de tu comunidad para habilitar clasificaciones reales."
          />
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los segmentos.";
    return <EmptyState title="Segmentos sin datos" description={message} />;
  }
}
