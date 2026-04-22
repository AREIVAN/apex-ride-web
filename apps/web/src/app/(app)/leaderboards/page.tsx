import { requireUser } from "@/features/auth/services/auth-server";
import { LeaderboardsHub } from "@/features/leaderboard/components/leaderboards-hub";
import { createLeaderboardService } from "@/features/leaderboard/services/leaderboard-service";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { Button } from "@/features/shared/ui/button";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { PageHeader } from "@/features/shared/ui/page-header";
import type { LeaderboardRow } from "@/types/domain";
import Link from "next/link";

export default async function LeaderboardsPage() {
  const { client, user } = await requireUser();

  try {
    const segments = await createSegmentsService(client).listPublic();
    let leaderboardBySegment: Record<string, LeaderboardRow[]> = {};
    let backendAvailable = true;

    try {
      leaderboardBySegment = await createLeaderboardService(client).bySegments(segments.map((segment) => segment.id));
    } catch {
      backendAvailable = false;
    }

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
      <div className="space-y-6">
        <PageHeader
          title="Clasificaciones"
          description="Vista competitiva con foco en posicion personal, filtros temporales y lectura por alcance."
        />
        <LeaderboardsHub
          segments={segments}
          leaderboardBySegment={leaderboardBySegment}
          userId={user.id}
          backendAvailable={backendAvailable}
        />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar las clasificaciones.";
    return <EmptyState title="Clasificaciones sin datos" description={message} />;
  }
}
