import { Card } from "@/features/shared/ui/card";
import type { Ride } from "@/types/domain";

function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export function RideSummaryCard({ ride }: { ride: Ride }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-base font-semibold text-slate-900">{ride.title}</h3>
        <span className="chip shrink-0">{ride.status}</span>
      </div>
      <p className="text-sm text-slate-600 sm:whitespace-nowrap">
        {ride.distanceKm.toFixed(1)} km · {ride.elevationGainM.toFixed(0)} m · {formatMinutes(ride.movingTimeSec)}
      </p>
    </Card>
  );
}
