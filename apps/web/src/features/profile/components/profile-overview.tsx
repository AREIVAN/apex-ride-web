import Link from "next/link";

import { Card } from "@/features/shared/ui/card";
import type { RiderProfile, Ride } from "@/types/domain";

interface ProfileOverviewProps {
  profile: RiderProfile;
  rides: Ride[];
  attemptsCount: number;
}

export function ProfileOverview({ profile, rides, attemptsCount }: ProfileOverviewProps) {
  const latest = rides.slice(0, 4);
  const completed = rides.filter((ride) => ride.status === "completed").length;
  const badges = [
    { label: "Consistencia", active: completed >= 5 },
    { label: "Cazador de segmentos", active: attemptsCount >= 10 },
    { label: "Constructor de desnivel", active: profile.totalElevationM >= 1000 }
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white">
            {profile.fullName.trim().slice(0, 1).toUpperCase() || "R"}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{profile.fullName}</h3>
            <p className="text-sm text-slate-600">@{profile.username} · {profile.city}, {profile.country}</p>
          </div>
        </div>
        <p className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm text-slate-700">
          {profile.bio || "Motociclista enfocado en mejorar tiempos y consistencia de trazadas."}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Info label="Distancia total" value={`${profile.totalDistanceKm.toFixed(0)} km`} />
          <Info label="Elevacion total" value={`${profile.totalElevationM.toFixed(0)} m`} />
          <Info label="Intentos" value={`${attemptsCount}`} />
          <Info label="Vehiculo" value={profile.vehicleModel || "Sin definir"} />
        </div>
      </Card>

      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Insignias y actividad reciente</h3>
          <p className="text-sm text-slate-600">Identidad competitiva y traccion de uso de la cuenta.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge.label} className={`chip ${badge.active ? "border-brand-200 bg-brand-50 text-brand-900" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
              {badge.label}
            </span>
          ))}
        </div>

        {latest.length ? (
          <div className="space-y-2">
            {latest.map((ride) => (
              <Link key={ride.id} href={`/rides/${ride.id}`} className="block rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 hover:border-brand-300">
                <p className="text-sm font-semibold text-slate-900">{ride.title}</p>
                <p className="text-xs text-slate-600">{new Date(ride.startedAt).toLocaleDateString()} · {ride.distanceKm.toFixed(1)} km</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600">Todavia no hay actividad reciente para mostrar.</p>
        )}
      </Card>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
