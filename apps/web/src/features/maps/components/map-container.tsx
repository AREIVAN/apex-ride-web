import { Card } from "@/features/shared/ui/card";

interface MapContainerProps {
  title?: string;
}

export function MapContainer({ title = "Mapa de actividad" }: MapContainerProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200/70 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="relative h-80 bg-gradient-to-br from-brand-100/90 via-cyan-100/85 to-emerald-100/80">
        <div className="absolute inset-0 bg-speed-grid bg-[size:18px_18px] opacity-35" />
        <div className="absolute left-5 top-5 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700">
          Listo para integrar MapLibre + tiles de produccion para rutas de moto
        </div>
      </div>
    </Card>
  );
}
