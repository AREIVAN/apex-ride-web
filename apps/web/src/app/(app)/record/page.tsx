"use client";

import { useState, useEffect, useMemo } from "react";

import { MapContainer } from "@/features/maps/components/map-container";
import { RideNavigationView } from "@/features/tracking/components/ride-navigation-view";
import { RecordingPanel, type LiveTrackPoint, type RecordingPanelState } from "@/features/tracking/components/recording-panel";
import { createClient } from "@/lib/supabase/browser";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { Card } from "@/features/shared/ui/card";
import { Button } from "@/features/shared/ui/button";
import { useAppShellNavigationMode } from "@/features/shared/ui/app-shell";
import { LoadingState } from "@/features/shared/ui/loading-state";
import type { SegmentDefinition } from "@/features/tracking/lib/tracking-types";
import type { SegmentLiveSnapshot } from "@/features/tracking/lib/segment-live-tracker";

interface SegmentInfo {
  id: string;
  name: string;
  distanceM: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  pathCoordinates?: [number, number][];
}

export default function RecordPage() {
  const { setNavigationMode } = useAppShellNavigationMode();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<SegmentInfo | null>(null);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [liveRoute, setLiveRoute] = useState<[number, number][]>([]);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [trackSamples, setTrackSamples] = useState<LiveTrackPoint[]>([]);
  const [segmentLiveSnapshot, setSegmentLiveSnapshot] = useState<SegmentLiveSnapshot | null>(null);
  const [rideState, setRideState] = useState<RecordingPanelState | null>(null);

  // Check auth on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
      setIsLoadingUser(false);
    });
  }, []);

  // Load segments
  useEffect(() => {
    if (!user) return;
    
    async function loadSegments() {
      setIsLoadingSegments(true);
      try {
        const supabase = createClient();
        const service = createSegmentsService(supabase);
        const allSegments = await service.listPublic();
        const mappedSegments = allSegments.slice(0, 10).map((s) => ({
          id: s.id,
          name: s.name,
          distanceM: s.distanceM || 0,
          startLat: s.startLat,
          startLng: s.startLng,
          endLat: s.endLat,
          endLng: s.endLng,
          pathCoordinates: s.pathCoordinates,
        }));
        setSegments(mappedSegments);
      } catch (error) {
        console.error("Error loading segments:", error);
      } finally {
        setIsLoadingSegments(false);
      }
    }
    loadSegments();
  }, [user]);

  // Convert selected segment to SegmentDefinition for RecordingPanel
  const activeSegment: SegmentDefinition | null = useMemo(() => {
    if (!selectedSegment) {
      return null;
    }

    return {
      id: selectedSegment.id,
      name: selectedSegment.name,
      start: { lat: selectedSegment.startLat, lng: selectedSegment.startLng },
      end: { lat: selectedSegment.endLat, lng: selectedSegment.endLng },
      route: selectedSegment.pathCoordinates && selectedSegment.pathCoordinates.length >= 2
        ? selectedSegment.pathCoordinates.map(([lng, lat]) => ({ lat, lng }))
        : [
            { lat: selectedSegment.startLat, lng: selectedSegment.startLng },
            { lat: selectedSegment.endLat, lng: selectedSegment.endLng }
          ],
      radiusM: 35
    };
  }, [selectedSegment]);

  const isNavigationMode =
    rideState?.status === "starting" ||
    rideState?.status === "recording" ||
    rideState?.status === "paused" ||
    rideState?.status === "saving";

  useEffect(() => {
    setNavigationMode(isNavigationMode);

    return () => setNavigationMode(false);
  }, [isNavigationMode, setNavigationMode]);

  if (isLoadingUser) {
    return (
      <div className="mx-auto max-w-2xl">
        <LoadingState />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 text-center">
          <p className="text-slate-600 mb-4">Debes iniciar sesión para grabar rodadas.</p>
          <Button onClick={() => window.location.href = "/login"}>Ir a login</Button>
        </Card>
      </div>
    );
  }

  // Convert selected segment to coordinates for map
  // Use pathCoordinates (full route) if available, otherwise fallback to start/end line
  let segmentCoordinates: [number, number][] | undefined;
  
  if (selectedSegment) {
    if (selectedSegment.pathCoordinates && selectedSegment.pathCoordinates.length >= 2) {
      segmentCoordinates = selectedSegment.pathCoordinates;
    } else {
      // Fallback: use start/end points as a simple line
      segmentCoordinates = [
        [selectedSegment.startLng, selectedSegment.startLat],
        [selectedSegment.endLng, selectedSegment.endLat]
      ];
    }
  }

  const recenterMap = () => {
    setFollowUser(true);
    setRecenterTrigger(t => t + 1);
  };

  const navigationTitle = selectedSegment ? `Segmento: ${selectedSegment.name}` : "Navegación en vivo";

  return (
    <>
    <div className={`space-y-4 overflow-x-hidden ${isNavigationMode ? "hidden" : ""}`}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="order-1 lg:order-2">
          <RecordingPanel
            riderId={user.id}
            activeSegment={activeSegment}
            onRouteUpdate={setLiveRoute}
            onCurrentPositionUpdate={setCurrentPosition}
            onTrackPointsUpdate={setTrackSamples}
            onSegmentSnapshotUpdate={setSegmentLiveSnapshot}
            onRideStateChange={setRideState}
            onRecordingStarted={() => {
              recenterMap();
            }}
          />
        </div>

        <div className="order-2 flex h-[42vh] min-h-[280px] flex-col gap-2 sm:h-[52vh] sm:min-h-[340px] lg:order-1 lg:h-[calc(100vh-210px)]">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
            <span>{followUser ? "Camara siguiendo GPS" : "Camara libre"}</span>
            <button
              type="button"
              onClick={() => setFollowUser(value => !value)}
              className="focus-ring rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
            >
              {followUser ? "Desactivar follow" : "Activar follow"}
            </button>
          </div>
          <MapContainer
            title={selectedSegment ? `Segmento: ${selectedSegment.name}` : "Mapa en vivo"}
            useUserLocation={true}
            routeCoordinates={liveRoute}
            trackSamples={trackSamples}
            segmentCoordinates={segmentCoordinates}
            recenterTrigger={recenterTrigger}
            currentPosition={currentPosition}
            segmentLiveSnapshot={segmentLiveSnapshot}
            followCurrentPosition={followUser}
            onFollowInterrupted={() => setFollowUser(false)}
            preserveCameraOnRouteUpdates={true}
          />
        </div>

        <Card className="order-3 p-4 sm:p-5 lg:col-start-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-900">Seleccionar segmento</h4>
            <span className="chip">Top {Math.min(segments.length, 10)}</span>
          </div>
          {isLoadingSegments ? (
            <p className="text-sm font-medium text-slate-500" role="status" aria-live="polite">
              Cargando segmentos...
            </p>
          ) : segments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              No hay segmentos disponibles
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {segments.map((segment) => (
                <button
                  key={segment.id}
                  onClick={() => setSelectedSegment(segment.id === selectedSegment?.id ? null : segment)}
                  className={`focus-ring min-h-11 w-full rounded-xl p-3 text-left text-sm transition-colors active:scale-[0.99] ${
                    selectedSegment?.id === segment.id
                      ? 'bg-brand-100 border-2 border-brand-400 shadow-[0_6px_18px_rgba(20,136,198,0.18)]'
                      : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium text-slate-900">{segment.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{(segment.distanceM / 1000).toFixed(1)} km</span>
                  </div>
                  {selectedSegment?.id === segment.id && (
                    <p className="text-xs text-brand-600 mt-1">✓ Segmento seleccionado - visible en el mapa</p>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedSegment && (
            <p className="mt-2 text-xs text-slate-500">
              El segmento se muestra en el mapa. Iniciá la grabación para intentar superarlo.
            </p>
          )}
        </Card>
      </div>
    </div>
    {isNavigationMode && rideState && (
      <RideNavigationView
        rideState={rideState}
        title={navigationTitle}
        routeCoordinates={liveRoute}
        trackSamples={trackSamples}
        segmentCoordinates={segmentCoordinates}
        segmentLiveSnapshot={segmentLiveSnapshot}
        currentPosition={currentPosition}
        followCurrentPosition={followUser}
        recenterTrigger={recenterTrigger}
        plannedDistanceM={selectedSegment?.distanceM ?? null}
        onRecenter={recenterMap}
        onFollowInterrupted={() => setFollowUser(false)}
      />
    )}
    </>
  );
}
