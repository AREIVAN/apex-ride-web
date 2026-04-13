import { ProfileForm } from "@/features/profile/components/profile-form";
import { ProfileOverview } from "@/features/profile/components/profile-overview";
import { createProfileService } from "@/features/profile/services/profile-service";
import { createRidesService } from "@/features/rides/services/rides-service";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { requireUser } from "@/features/auth/services/auth-server";
import { PageHeader } from "@/features/shared/ui/page-header";

export default async function ProfilePage() {
  const { client, user } = await requireUser();

  try {
    const profile = await createProfileService(client).getById(user.id);

    if (!profile) {
      return (
        <EmptyState
          title="No encontramos tu perfil"
          description="Completa el registro nuevamente para crear el perfil base en Supabase Auth."
        />
      );
    }

    const [rides, attemptsResult] = await Promise.all([
      createRidesService(client).listByRider(user.id),
      client
        .from("segment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("rider_id", user.id)
    ]);

    return (
      <div className="space-y-4">
        <PageHeader
          title="Perfil"
          description="Perfil con identidad, metricas acumuladas, insignias y actividad reciente para contexto competitivo."
        />
        <ProfileOverview
          profile={profile}
          rides={rides.slice(0, 8)}
          attemptsCount={attemptsResult.count ?? 0}
        />
        <ProfileForm profile={profile} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar tu perfil.";
    return <EmptyState title="Perfil sin datos" description={message} />;
  }
}
