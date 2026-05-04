"use client";

import { MapContainer } from "@/features/maps/components/map-container";
import type { SegmentLiveSnapshot } from "@/features/tracking/lib/segment-live-tracker";

import type { LiveTrackPoint, RecordingPanelState } from "./recording-panel";
import { RideHud } from "./ride-hud";
import { RideMapControls } from "./ride-map-controls";

interface RideNavigationViewProps {
  rideState: RecordingPanelState;
  title: string;
  routeCoordinates: [number, number][];
  trackSamples: LiveTrackPoint[];
  segmentCoordinates?: [number, number][];
  segmentLiveSnapshot: SegmentLiveSnapshot | null;
  currentPosition: [number, number] | null;
  followCurrentPosition: boolean;
  recenterTrigger: number;
  plannedDistanceM?: number | null;
  onRecenter: () => void;
  onFollowInterrupted: () => void;
}

export function RideNavigationView({
  rideState,
  title,
  routeCoordinates,
  trackSamples,
  segmentCoordinates,
  segmentLiveSnapshot,
  currentPosition,
  followCurrentPosition,
  recenterTrigger,
  plannedDistanceM,
  onRecenter,
  onFollowInterrupted,
}: RideNavigationViewProps) {
  const isPaused = rideState.status === "paused";
  const isSaving = rideState.status === "saving";

  return (
    <div className="fixed inset-0 z-40 h-dvh w-screen overflow-hidden bg-slate-950 text-white">
      <MapContainer
        title={title}
        variant="bare"
        className="h-full w-full"
        mapClassName="h-full w-full"
        showControls={false}
        showHeader={false}
        showSpeedLegend={false}
        showSegmentOverlay={false}
        useUserLocation={true}
        routeCoordinates={routeCoordinates}
        trackSamples={trackSamples}
        segmentCoordinates={segmentCoordinates}
        recenterTrigger={recenterTrigger}
        currentPosition={currentPosition}
        segmentLiveSnapshot={segmentLiveSnapshot}
        followCurrentPosition={followCurrentPosition}
        onFollowInterrupted={onFollowInterrupted}
        preserveCameraOnRouteUpdates={true}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-40 bg-gradient-to-t from-black/35 via-black/12 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between gap-3 p-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-[rgba(10,15,25,0.94)] px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.42)] landscape:py-1.5">
          <p className="truncate text-xs font-bold text-white">{title}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-300">{isPaused ? "Rodada pausada" : isSaving ? "Guardando rodada" : rideState.panelMessage}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[rgba(10,15,25,0.94)] text-sm font-black text-white shadow-[0_10px_26px_rgba(0,0,0,0.42)] landscape:h-10 landscape:w-10">
          N
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 p-3 pb-[max(12px,env(safe-area-inset-bottom))] landscape:flex-row landscape:items-end landscape:justify-between landscape:gap-2">
        <div className="w-full max-w-[620px] landscape:min-w-0 landscape:max-w-[560px] landscape:flex-1">
          <RideHud rideState={rideState} plannedDistanceM={plannedDistanceM} />
        </div>
        <RideMapControls
          isPaused={isPaused}
          isSaving={isSaving}
          onPause={rideState.actions.pause}
          onResume={rideState.actions.resume}
          onFinish={rideState.actions.finish}
          onRecenter={onRecenter}
        />
      </div>
    </div>
  );
}
