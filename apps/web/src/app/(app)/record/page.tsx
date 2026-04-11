import { MapContainer } from "@/features/maps/components/map-container";
import { RecordingPanel } from "@/features/tracking/components/recording-panel";
import { requireUser } from "@/features/auth/services/auth-server";

export default async function RecordPage() {
  const { user } = await requireUser();

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <MapContainer title="Mapa en vivo" />
      <RecordingPanel riderId={user.id} />
    </div>
  );
}
