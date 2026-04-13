import { requireUser } from "@/features/auth/services/auth-server";
import { LeaderboardTable } from "@/features/leaderboard/components/leaderboard-table";
import { createLeaderboardService } from "@/features/leaderboard/services/leaderboard-service";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { PageHeader } from "@/features/shared/ui/page-header";

export default async function LeaderboardsPage() {
  const { client } = await requireUser();

  try {
    const segments = await createSegmentsService(client).listPublic();
    const topSegments = segments.slice(0, 3);
    const leaderboardBySegment = await createLeaderboardService(client).bySegments(topSegments.map((segment) => segment.id));

    if (!topSegments.length) {
      return (
        <EmptyState
          title="Aun no hay segmentos publicados"
          description="Crea segmentos para habilitar leaderboards entre riders de moto."
        />
      );
    }

    return (
      <div className="space-y-6">
        <PageHeader
          title="Leaderboards por segmento"
          description="Top de tiempos validados para cada segmento activo."
        />
        {topSegments.map((segment) => {
          const rows = leaderboardBySegment[segment.id] ?? [];
          return (
            <section key={segment.id} className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">{segment.name}</h3>
              {rows.length ? (
                <LeaderboardTable rows={rows.slice(0, 10)} />
              ) : (
                <EmptyState
                  title="Segmento sin tiempos"
                  description="Todavia no hay intentos validados para este segmento."
                />
              )}
            </section>
          );
        })}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los leaderboards.";
    return <EmptyState title="Leaderboards sin datos" description={message} />;
  }
}
