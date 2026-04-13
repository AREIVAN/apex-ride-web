import { SegmentCreateForm } from "@/features/segments/components/segment-create-form";
import { PageHeader } from "@/features/shared/ui/page-header";

export default function CreateSegmentPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Crear segmento"
        description="Define inicio, fin y recorrido para habilitar comparativas de tiempo en la comunidad."
      />
      <SegmentCreateForm />
    </div>
  );
}
