import { requireUser } from "@/features/auth/services/auth-server";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import { getDashboardSnapshot } from "@/features/dashboard/services/dashboard-service";
import { MapContainer } from "@/features/maps/components/map-container";
import { EmptyState } from "@/features/shared/ui/empty-state";

export default async function DashboardPage() {
  const { client, user } = await requireUser();

  try {
    const snapshot = await getDashboardSnapshot(client, user.id);

    return (
      <div className="space-y-6">
        <DashboardOverview {...snapshot} />
        <MapContainer title="Mapa de calor de rodadas recientes" />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el dashboard.";
    return <EmptyState title="Dashboard sin datos" description={message} />;
  }
}
