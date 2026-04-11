import { ProfileForm } from "@/features/profile/components/profile-form";
import { createProfileService } from "@/features/profile/services/profile-service";
import { EmptyState } from "@/features/shared/ui/empty-state";
import { requireUser } from "@/features/auth/services/auth-server";

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

    return <ProfileForm profile={profile} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar tu perfil.";
    return <EmptyState title="Perfil sin datos" description={message} />;
  }
}
