"use client";

import { useState, useCallback, useEffect } from "react";

import { MapContainer } from "@/features/maps/components/map-container";
import { RecordingPanel, type RideMetrics } from "@/features/tracking/components/recording-panel";
import { createClient } from "@/lib/supabase/browser";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { Card } from "@/features/shared/ui/card";
import { Button } from "@/features/shared/ui/button";
import { PageHeader } from "@/features/shared/ui/page-header";
import { LoadingState } from "@/features/shared/ui/loading-state";
import type { SegmentDefinition } from "@/features/tracking/lib/tracking-types";

interface SegmentInfo {
  id: string;
  name: string;
  distanceM: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  routeCoordinates?: [number, number][];
}

export default function RecordPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [metrics, setMetrics] = useState<RideMetrics | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentInfo | null>(null);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);

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
        setSegments(allSegments.slice(0, 10).map((s) => ({
          id: s.id,
          name: s.name,
          distanceM: s.distanceM || 0,
          startLat: s.startLat,
          startLng: s.startLng,
          endLat: s.endLat,
          endLng: s.endLng,
        })));
      } catch (error) {
        console.error("Error loading segments:", error);
      } finally {
        setIsLoadingSegments(false);
      }
    }
    loadSegments();
  }, [user]);

  const handleMetricsUpdate = useCallback((newMetrics: RideMetrics) => {
    setMetrics(newMetrics);
  }, []);

  // Convert selected segment to SegmentDefinition for RecordingPanel
  const activeSegment: SegmentDefinition | null = selectedSegment ? {
    id: selectedSegment.id,
    name: selectedSegment.name,
    start: { lat: selectedSegment.startLat, lng: selectedSegment.startLng },
    end: { lat: selectedSegment.endLat, lng: selectedSegment.endLng },
    route: [
      { lat: selectedSegment.startLat, lng: selectedSegment.startLng },
      { lat: selectedSegment.endLat, lng: selectedSegment.endLng }
    ],
    radiusM: 35
  } : null;

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
  const segmentCoordinates: [number, number][] | undefined = selectedSegment ? [
    [selectedSegment.startLng, selectedSegment.startLat],
    [selectedSegment.endLng, selectedSegment.endLat]
  ] : undefined;

  return (
    <div className="space-y-4 overflow-x-hidden">
      <PageHeader
        title="Record"
        description="Panel de grabacion en vivo con mapa, metrica de velocidad y segmentos para intentos."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* Map */}
        <div className="order-2 h-[42vh] min-h-[280px] sm:h-[52vh] sm:min-h-[340px] xl:order-1 xl:h-[calc(100vh-210px)]">
          <MapContainer
            title={selectedSegment ? `Segmento: ${selectedSegment.name}` : "Mapa en vivo"}
            useUserLocation={true}
            segmentCoordinates={segmentCoordinates}
          />
        </div>

        {/* Recording Panel + Segments */}
        <div className="order-1 space-y-4 xl:order-2">
          <RecordingPanel
            riderId={user.id}
            onMetricsUpdate={handleMetricsUpdate}
            activeSegment={activeSegment}
          />

        {/* Segments quick access */}
        <Card className="p-4 sm:p-5">
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
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{segment.name}</span>
                    <span className="text-xs text-slate-500">{(segment.distanceM / 1000).toFixed(1)} km</span>
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
    </div>
  );
}
