import { LoadingState } from "@/features/shared/ui/loading-state";

export default function RidesLoading() {
  return (
    <div className="space-y-3">
      <LoadingState />
      <LoadingState />
    </div>
  );
}
