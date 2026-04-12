import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "@/features/settings/components/settings-panel";
import { createSettingsService } from "@/features/settings/services/settings-service";
import { requireUser } from "@/features/auth/services/auth-server";
import { EmptyState } from "@/features/shared/ui/empty-state";

export default async function SettingsPage() {
  const { user } = await requireUser();
  const client = await createClient();
  const service = createSettingsService(client);

  try {
    let initialSettings = null;
    try {
      initialSettings = await service.getSettings(user.id);
    } catch {
      initialSettings = null;
    }

    return <SettingsPanel userId={user.id} initialSettings={initialSettings} />;
  } catch {
    return (
      <EmptyState
        title="Sin ajustes disponibles"
        description="No pudimos cargar configuracion desde Supabase. Reintenta en unos minutos."
      />
    );
  }
}