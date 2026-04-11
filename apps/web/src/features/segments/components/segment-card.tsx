import { Card } from "@/features/shared/ui/card";
import type { Segment } from "@/types/domain";

export function SegmentCard({ segment }: { segment: Segment }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{segment.name}</h3>
        <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold uppercase text-brand-900">
          {segment.visibility}
        </span>
      </div>
      <p className="text-sm text-slate-600">{segment.description}</p>
      <p className="text-sm font-medium text-slate-700">
        {(segment.distanceM / 1000).toFixed(2)} km · {segment.elevationGainM} m · {segment.avgGradientPct.toFixed(1)}%
      </p>
    </Card>
  );
}
