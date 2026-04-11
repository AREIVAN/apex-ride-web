import Link from "next/link";

import { requireUser } from "@/features/auth/services/auth-server";
import { RideSummaryCard } from "@/features/rides/components/ride-summary-card";
import { createRidesService } from "@/features/rides/services/rides-service";
import { Button } from "@/features/shared/ui/button";
import { EmptyState } from "@/features/shared/ui/empty-state";

export default async function RidesPage() {
  const { client, user } = await requireUser();

  try {
    const rides = await createRidesService(client).listByRider(user.id);

    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Tus rodadas</h2>
        {!rides.length ? (
          <EmptyState
            title="Todavia no tenes salidas registradas"
            description="Inicia una rodada desde Record para comenzar a guardar trazas y estadisticas de moto."
          />
        ) : (
          rides.map((ride) => (
            <Link key={ride.id} href={`/rides/${ride.id}`} className="block transition-transform hover:-translate-y-0.5">
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
