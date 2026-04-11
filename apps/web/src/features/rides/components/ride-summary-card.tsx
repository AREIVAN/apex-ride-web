import { Card } from "@/features/shared/ui/card";
import type { Ride } from "@/types/domain";

function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export function RideSummaryCard({ ride }: { ride: Ride }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{ride.title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{ride.status}</span>
      </div>
      <p className="text-sm text-slate-600">
        {ride.distanceKm.toFixed(1)} km · {ride.elevationGainM.toFixed(0)} m · {formatMinutes(ride.movingTimeSec)}
      </p>
    </Card>
  );
}
