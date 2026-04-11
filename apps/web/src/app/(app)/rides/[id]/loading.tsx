import { LoadingState } from "@/features/shared/ui/loading-state";

export default function RideDetailLoading() {
  return (
    <div className="space-y-3">
      <LoadingState />
      <LoadingState />
    </div>
  );
}
