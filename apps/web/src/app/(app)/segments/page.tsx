import Link from "next/link";

import { requireUser } from "@/features/auth/services/auth-server";
import { SegmentCard } from "@/features/segments/components/segment-card";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { Button } from "@/features/shared/ui/button";
import { EmptyState } from "@/features/shared/ui/empty-state";

export default async function SegmentsPage() {
  const { client } = await requireUser();

  try {
    const segments = await createSegmentsService(client).listPublic();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Segmentos</h2>
          <Link href="/segments/create">
            <Button>Nuevo segmento</Button>
          </Link>
        </div>

        {segments.length ? (
          segments.map((segment) => (
            <Link
              key={segment.id}
              href={`/segments/${segment.id}`}
              className="block transition-transform hover:-translate-y-0.5"
            >
              <SegmentCard segment={segment} />
            </Link>
          ))
        ) : (
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
