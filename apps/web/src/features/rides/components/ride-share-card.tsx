import { RideRouteStaticMap } from "@/features/rides/components/ride-route-static-map";
import { formatRideDateTime, formatRideDuration, type RideShareData } from "@/features/rides/lib/ride-share-export";

interface RideShareCardProps {
  data: RideShareData;
}

export function RideShareCard({ data }: RideShareCardProps) {
  const metrics = [
    { label: "Distancia", value: `${data.distanceKm.toFixed(1)} km` },
    { label: "Tiempo efectivo", value: formatRideDuration(data.movingTimeSec) },
    { label: "Vel. media", value: `${data.avgSpeedKmh.toFixed(1)} km/h` },
    { label: "Vel. máxima", value: `${data.maxSpeedKmh.toFixed(1)} km/h` },
    { label: "Elevación", value: `${data.elevationGainM.toFixed(0)} m` },
    { label: "Puntos GPS", value: `${data.pointCount}` }
  ];

  return (
    <article className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-[0_32px_90px_rgba(2,6,23,0.46)] sm:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,rgba(45,212,191,0.42),transparent_34%),linear-gradient(135deg,#06151f_0%,#081f28_45%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(120deg,transparent_0,transparent_44%,rgba(34,211,238,0.5)_45%,transparent_46%,transparent_100%)] [background-size:130px_130px]" />

      <div className="relative z-10 flex h-full flex-col gap-4">
        <header className="flex items-center gap-3 rounded-3xl border border-teal-300/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-300 text-lg font-black text-slate-950">A</div>
          <div>
            <p className="text-lg font-black tracking-tight">Apex Ride</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/85">Inteligencia de rodadas</p>
          </div>
        </header>

        <section className="space-y-1.5">
          <p className="text-3xl font-black tracking-tight sm:text-5xl">Rodada completada</p>
          <h2 className="line-clamp-2 text-xl font-extrabold text-teal-50 sm:text-3xl">{data.title}</h2>
          <p className="text-sm font-semibold text-slate-300 sm:text-base">{formatRideDateTime(data.startedAt)}</p>
        </section>

        <RideRouteStaticMap coordinates={data.routeCoordinates} routePoints={data.routePoints} />

        <section className="grid flex-1 grid-cols-2 gap-2.5 sm:gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.075] px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-100/80 sm:text-xs">{metric.label}</p>
              <p className="mt-1 text-lg font-black tracking-tight text-white sm:text-2xl">{metric.value}</p>
            </div>
          ))}
        </section>

        <footer className="rounded-full bg-teal-300/15 px-4 py-2 text-center text-sm font-black text-teal-50">
          Compartido desde Apex Ride
        </footer>
      </div>
    </article>
  );
}
