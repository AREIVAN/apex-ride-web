import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";
import { FlaggedAttemptsPanel } from "@/features/admin/components/flagged-attempts-panel";
import { createAdminService } from "@/features/admin/services/admin-service";
import { requireUser } from "@/features/auth/services/auth-server";
import { EmptyState } from "@/features/shared/ui/empty-state";

export default async function AdminPage() {
  const { user } = await requireUser();
  const client = createClient();
  const service = createAdminService(client);

  const isAdminUser = await service.isAdmin(user.id);

  if (!isAdminUser) {
    return (
      <EmptyState
        title="Acceso denegado"
        description="No tienes permisos de administrador para acceder a esta pagina."
      />
    );
  }

  try {
    const initialAttempts = await service.getFlaggedAttempts();

    return (
      <div className="space-y-6">
        <FlaggedAttemptsPanel initialAttempts={initialAttempts} userId={user.id} />
      </div>
    );
  } catch {
    return (
      <EmptyState
        title="Error al cargar"
        description="No pudimos cargar los reportes. Reintenta en unos minutos."
      />
    );
  }
}