"use client";

import { Card } from "@/features/shared/ui/card";
import { Button } from "@/features/shared/ui/button";
import type { PlannedRoute } from "../types/planned-route";
import { formatRouteDistance, formatRouteDuration } from "../lib/planned-route-utils";
import { cn } from "@/lib/utils/cn";

interface PlannedRouteSummaryProps {
  route: PlannedRoute | null;
  onClear: () => void;
  onChangeDestination: () => void;
  className?: string;
}

export function PlannedRouteSummary({
  route,
  onClear,
  onChangeDestination,
  className,
}: PlannedRouteSummaryProps) {
  if (!route) return null;

  return (
    <Card className={cn("p-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Destino seleccionado
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-900">
            {route.destination.name}
          </p>
          {route.destination.address && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {route.destination.address}
            </p>
          )}
          
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {formatRouteDistance(route.distanceM)}
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatRouteDuration(route.durationSec)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <Button
            variant="ghost"
            onClick={onChangeDestination}
            className="h-7 px-2 text-xs"
          >
            Cambiar
          </Button>
          <Button
            variant="ghost"
            onClick={onClear}
            className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50"
          >
            Limpiar
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Compact version for inline display
 */
export function PlannedRouteSummaryInline({
  route,
  className,
}: {
  route: PlannedRoute | null;
  className?: string;
}) {
  if (!route) return null;

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <span className="rounded-full bg-brand-100 px-2 py-1 font-medium text-brand-700">
        Ruta activa
      </span>
      <span className="text-slate-600">
        {formatRouteDistance(route.distanceM)} · {formatRouteDuration(route.durationSec)}
      </span>
    </div>
  );
}