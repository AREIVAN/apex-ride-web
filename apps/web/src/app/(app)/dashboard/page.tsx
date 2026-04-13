import { requireUser } from "@/features/auth/services/auth-server";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import { getDashboardSnapshot } from "@/features/dashboard/services/dashboard-service";
import { MapContainer } from "@/features/maps/components/map-container";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { PageHeader } from "@/features/shared/ui/page-header";

export default async function DashboardPage() {
  const { client, user } = await requireUser();

  try {
    const snapshot = await getDashboardSnapshot(client, user.id);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Panel"
          description="Resumen de actividad reciente, desnivel acumulado e intentos de segmentos."
        />
        <DashboardOverview {...snapshot} />
        <MapContainer title="Mapa de actividad reciente" />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el panel.";
    return <EmptyState title="Panel sin datos" description={message} />;
  }
}
