export function LoadingState() {
  return (
    <div className="surface-panel space-y-4 p-5" role="status" aria-live="polite" aria-label="Cargando datos">
      <div className="skeleton-shimmer h-4 w-44 rounded" />
      <div className="space-y-2">
        <div className="skeleton-shimmer h-3 w-full rounded" />
        <div className="skeleton-shimmer h-3 w-2/3 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="skeleton-shimmer h-11 rounded-xl" />
        <div className="skeleton-shimmer h-11 rounded-xl" />
      </div>
    </div>
  );
}
