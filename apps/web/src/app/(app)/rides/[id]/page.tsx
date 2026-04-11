import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/services/auth-server";
import { MapContainer } from "@/features/maps/components/map-container";
import { RideSummaryCard } from "@/features/rides/components/ride-summary-card";
import { createRidesService } from "@/features/rides/services/rides-service";
import { EmptyState } from "@/features/shared/ui/empty-state";

export default async function RideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { client, user } = await requireUser();
  const { id } = await params;

  try {
    const ridesService = createRidesService(client);
    const [ride, pointCount] = await Promise.all([ridesService.getById(id, user.id), ridesService.getPointCount(id, user.id)]);
    if (!ride) notFound();

    return (
      <div className="space-y-4">
        <RideSummaryCard ride={ride} />
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
          Puntos GPS almacenados: <span className="font-bold text-slate-900">{pointCount}</span>
        </p>
        <MapContainer title="Traza de la rodada" />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el detalle de la rodada.";
    return <EmptyState title="Detalle sin datos" description={message} />;
  }
}
