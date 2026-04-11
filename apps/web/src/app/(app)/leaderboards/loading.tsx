import { LoadingState } from "@/features/shared/ui/loading-state";

export default function LeaderboardsLoading() {
  return (
    <div className="space-y-3">
      <LoadingState />
      <LoadingState />
    </div>
  );
}
