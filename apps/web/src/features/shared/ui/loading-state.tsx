export function LoadingState() {
  return (
    <div className="surface-panel space-y-3 rounded-2xl p-5" role="status" aria-live="polite" aria-label="Cargando datos">
      <div className="skeleton-shimmer h-4 w-40 rounded" />
      <div className="skeleton-shimmer h-3 w-full rounded" />
      <div className="skeleton-shimmer h-3 w-2/3 rounded" />
    </div>
  );
}
