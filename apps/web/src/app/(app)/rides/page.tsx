import Link from "next/link";

import { requireUser } from "@/features/auth/services/auth-server";
import { RidesExplorer } from "@/features/rides/components/rides-explorer";
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
          description="Historial profesional con filtros, metricas y acceso rapido al detalle operativo de cada salida."
          actions={
            <Link href="/record">
              <Button>Grabar nueva rodada</Button>
            </Link>
          }
        />
        <RidesExplorer rides={rides} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar tus salidas.";
    return <EmptyState title="Rodadas sin datos" description={message} />;
  }
}
