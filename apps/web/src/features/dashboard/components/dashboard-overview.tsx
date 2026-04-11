import { StatsWidget } from "./stats-widget";

interface DashboardOverviewProps {
  weeklyDistanceKm: number;
  weeklyElevationM: number;
  recentPrs: number;
}

export function DashboardOverview({ weeklyDistanceKm, weeklyElevationM, recentPrs }: DashboardOverviewProps) {
  const widgets = [
    {
      label: "Distancia semanal",
      value: `${weeklyDistanceKm.toFixed(1)} km`,
      trend: weeklyDistanceKm > 0 ? "Rodadas activas en los ultimos 7 dias" : "Sin distancia registrada esta semana"
    },
    {
      label: "Desnivel semanal",
      value: `${weeklyElevationM.toFixed(0)} m`,
      trend: weeklyElevationM > 0 ? "Acumulado en rutas con pendientes" : "Subi una ruta con desnivel para ver este KPI"
    },
    {
      label: "Intentos de segmento",
      value: `${recentPrs}`,
      trend: recentPrs > 0 ? "Intentos detectados esta semana" : "Todavia no hay intentos esta semana"
    }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {widgets.map((item) => (
        <StatsWidget key={item.label} {...item} />
      ))}
    </section>
  );
}
