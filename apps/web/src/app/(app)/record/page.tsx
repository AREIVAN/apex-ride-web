"use client";

import { useState, useCallback, useEffect } from "react";

import { MapContainer } from "@/features/maps/components/map-container";
import { RecordingPanel, type RideMetrics } from "@/features/tracking/components/recording-panel";
import { createClient } from "@/lib/supabase/browser";
import { createSegmentsService } from "@/features/segments/services/segments-service";
import { Card } from "@/features/shared/ui/card";
import { Button } from "@/features/shared/ui/button";
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-brand-600 mx-auto mb-4" />
          <p className="text-slate-600">Cargando...</p>
        </div>
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
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* Map */}
      <div className="h-[calc(100vh-140px)]">
        <MapContainer 
          title={selectedSegment ? `Segmento: ${selectedSegment.name}` : "Mapa en vivo"}
          useUserLocation={true}
          segmentCoordinates={segmentCoordinates}
        />
      </div>

      {/* Recording Panel + Segments */}
      <div className="space-y-4">
        <RecordingPanel 
          riderId={user.id}
          onMetricsUpdate={handleMetricsUpdate}
          activeSegment={activeSegment}
        />

        {/* Segments quick access */}
        <Card className="p-4">
          <h4 className="font-semibold text-slate-900 mb-2">Seleccionar segmento</h4>
          {isLoadingSegments ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : segments.length === 0 ? (
            <p className="text-sm text-slate-500">No hay segmentos disponibles</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {segments.map((segment) => (
                <button
                  key={segment.id}
                  onClick={() => setSelectedSegment(segment.id === selectedSegment?.id ? null : segment)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                    selectedSegment?.id === segment.id
                      ? 'bg-brand-100 border-2 border-brand-400'
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
            <p className="text-xs text-slate-500 mt-2">
              El segmento se muestra en el mapa. Iniciá la grabación para intentar superarlo.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}