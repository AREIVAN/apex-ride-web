import Link from "next/link";

import { requireUser } from "@/features/auth/services/auth-server";
import { RideSummaryCard } from "@/features/rides/components/ride-summary-card";
import { createRidesService } from "@/features/rides/services/rides-service";
import { Button } from "@/features/shared/ui/button";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { PageHeader } from "@/features/shared/ui/page-header";

export default async function RidesPage() {
  const { client, user } = await requireUser();

  try {
    const rides = await createRidesService(client).listByRider(user.id);

    return (
      <div className="space-y-4">
        <PageHeader
          title="Tus rodadas"
          description="Historial de actividades grabadas con resumen de distancia, elevacion y tiempo efectivo."
        />
        {!rides.length ? (
          <EmptyState
            title="Todavia no tenes salidas registradas"
            description="Inicia una rodada desde Record para comenzar a guardar trazas y estadisticas de moto."
          />
        ) : (
          rides.map((ride) => (
            <Link key={ride.id} href={`/rides/${ride.id}`} className="block">
              <RideSummaryCard ride={ride} />
            </Link>
          ))
        )}
        <Link href="/record">
          <Button>Ir a grabar una rodada</Button>
        </Link>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar tus salidas.";
    return <EmptyState title="Rodadas sin datos" description={message} />;
  }
}
