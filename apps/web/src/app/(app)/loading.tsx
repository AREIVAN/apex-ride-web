import { LoadingState } from "@/features/shared/ui/loading-state";

export default function AppLoading() {
  return (
    <div className="space-y-4">
      <LoadingState />
      <LoadingState />
    </div>
  );
}
