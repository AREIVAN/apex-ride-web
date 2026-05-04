"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, LineString } from "geojson";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { SegmentLiveSnapshot } from "@/features/tracking/lib/segment-live-tracker";

import { Card } from "@/features/shared/ui/card";
import { cn } from "@/lib/utils/cn";
import {
  MAP_DEFAULTS,
  MAP_FALLBACK_STYLE,
  ROUTE_COLORS,
  ROUTE_WIDTHS,
  filterValidCoordinates,
  getMapboxToken,
  resolveMapStyle,
} from "../lib/map-config";
import {
  buildSegmentProgressCoordinates,
  buildSpeedSegmentFeatureCollection,
  computeSegmentRelation,
  type TrackSpeedSample,
} from "../lib/live-route-analytics";

interface MapContainerProps {
  title?: string;
  center?: [number, number];
  zoom?: number;
  showControls?: boolean;
  variant?: "card" | "bare";
  className?: string;
  mapClassName?: string;
  showHeader?: boolean;
  showSpeedLegend?: boolean;
  showSegmentOverlay?: boolean;
  onMapReady?: (map: mapboxgl.Map) => void;
  useUserLocation?: boolean;
  routeCoordinates?: [number, number][];
  segmentCoordinates?: [number, number][];
  recenterTrigger?: number;
  focusOnSegment?: boolean;
  currentPosition?: [number, number] | null;
  trackSamples?: TrackSpeedSample[];
  segmentLiveSnapshot?: SegmentLiveSnapshot | null;
  followCurrentPosition?: boolean;
  onFollowInterrupted?: () => void;
  preserveCameraOnRouteUpdates?: boolean;
}

const DEFAULT_ZOOM = MAP_DEFAULTS.zoom;
const FALLBACK_CENTER = MAP_DEFAULTS.center;
const MAP_FATAL_ERROR_COPY =
  "No pudimos cargar el mapa. Puede haber un problema de configuración del proveedor o de conectividad.";

type MapErrorKind = "fatal-auth" | "fatal-style" | "fatal-load" | "transient" | "unknown";

type ClassifiedMapError = {
  kind: MapErrorKind;
  fatal: boolean;
  message: string;
  status?: number;
  sourceId?: string;
};

function normalizeCoordinate(value: unknown): [number, number] | null {
  const isValidValue = (lng: unknown, lat: unknown) => {
    return (
      typeof lng === "number" &&
      Number.isFinite(lng) &&
      lng >= -180 &&
      lng <= 180 &&
      typeof lat === "number" &&
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90
    );
  };

  if (Array.isArray(value) && value.length >= 2) {
    const [lng, lat] = value;
    return isValidValue(lng, lat) ? [lng as number, lat as number] : null;
  }

  if (typeof value === "object" && value !== null) {
    const coordinate = value as { lng?: unknown; lon?: unknown; lat?: unknown };
    const lng = coordinate.lng ?? coordinate.lon;
    const lat = coordinate.lat;
    return isValidValue(lng, lat) ? [lng as number, lat as number] : null;
  }

  return null;
}

function normalizeMapErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }

  return "Unknown map error";
}

function extractStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;

  const e = error as { status?: unknown; statusCode?: unknown; httpStatus?: unknown };
  const statusValue = e.status ?? e.statusCode ?? e.httpStatus;
  return typeof statusValue === "number" ? statusValue : undefined;
}

function classifyMapError(event: unknown): ClassifiedMapError {
  const eventData = (event ?? {}) as {
    error?: unknown;
    sourceId?: unknown;
    sourceDataType?: unknown;
  };

  const error = eventData.error ?? event;
  const message = normalizeMapErrorMessage(error);
  const status = extractStatus(error);
  const sourceId = typeof eventData.sourceId === "string" ? eventData.sourceId : undefined;
  const sourceDataType =
    typeof eventData.sourceDataType === "string" ? eventData.sourceDataType : undefined;
  const text = `${message} ${sourceId ?? ""} ${sourceDataType ?? ""}`.toLowerCase();

  if (status === 401 || status === 403) {
    return { kind: "fatal-auth", fatal: true, message, status, sourceId };
  }

  if (/token|unauthorized|forbidden|not authorized|authentication|access denied/.test(text)) {
    return { kind: "fatal-auth", fatal: true, message, status, sourceId };
  }

  if (status === 404 && /style|sprite|glyph/.test(text)) {
    return { kind: "fatal-style", fatal: true, message, status, sourceId };
  }

  if (/style|stylesheet|sprite|glyph|failed to load style/.test(text)) {
    return { kind: "fatal-style", fatal: true, message, status, sourceId };
  }

  if (/webgl|context lost|not supported/.test(text)) {
    return { kind: "fatal-load", fatal: true, message, status, sourceId };
  }

  if (/tile|network|timeout|temporar|source|fetch|xhr|request/.test(text)) {
    return { kind: "transient", fatal: false, message, status, sourceId };
  }

  return { kind: "unknown", fatal: false, message, status, sourceId };
}

// Get user's current location
function getUserLocation(): Promise<[number, number]> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(FALLBACK_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([position.coords.longitude, position.coords.latitude]);
      },
      () => {
        resolve(FALLBACK_CENTER);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  });
}

export function MapContainer({
  title = "Mapa de actividad",
  center,
  zoom = DEFAULT_ZOOM,
  showControls = true,
  variant = "card",
  className,
  mapClassName,
  showHeader = true,
  showSpeedLegend = true,
  showSegmentOverlay = true,
  onMapReady,
  useUserLocation = true,
  routeCoordinates,
  segmentCoordinates,
  recenterTrigger,
  focusOnSegment = true,
  currentPosition = null,
  trackSamples = [],
  segmentLiveSnapshot = null,
  followCurrentPosition = false,
  onFollowInterrupted,
  preserveCameraOnRouteUpdates = false,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const getUserLocationFn = useRef<() => Promise<[number, number]>>(getUserLocation);
  const isUsingFallbackStyle = useRef(false);
  const hasAttemptedFallback = useRef(false);
  const currentPositionMarker = useRef<mapboxgl.Marker | null>(null);
  const segmentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const lastFollowAtRef = useRef(0);

  const safeRouteCoordinates = useMemo(
    () => routeCoordinates ? filterValidCoordinates(routeCoordinates) : [],
    [routeCoordinates]
  );
  const safeSegmentCoordinates = useMemo(
    () => segmentCoordinates ? filterValidCoordinates(segmentCoordinates) : [],
    [segmentCoordinates]
  );
  const safeTrackSamples = useMemo(
    () =>
      trackSamples.filter(
        (sample) => Number.isFinite(sample.lng) && Number.isFinite(sample.lat)
      ),
    [trackSamples]
  );
  const safeCurrentPosition = useMemo(() => normalizeCoordinate(currentPosition), [currentPosition]);
  const segmentRelation = useMemo(
    () =>
      safeCurrentPosition && safeSegmentCoordinates.length >= 2
        ? computeSegmentRelation(safeCurrentPosition, safeSegmentCoordinates)
        : null,
    [safeCurrentPosition, safeSegmentCoordinates]
  );
  const snapshotRelation = useMemo(() => {
    if (!segmentLiveSnapshot || segmentLiveSnapshot.projectedSegmentIndex === null) {
      return null;
    }

    const projectedPoint = normalizeCoordinate(segmentLiveSnapshot?.projectedPoint);
    if (!projectedPoint) return null;

    return {
      distanceM: segmentLiveSnapshot.distanceToRouteM,
      progressPct: segmentLiveSnapshot.progressPct,
      projectedPoint,
      projectedSegmentIndex: segmentLiveSnapshot.projectedSegmentIndex,
    };
  }, [segmentLiveSnapshot]);
  const effectiveSegmentRelation = snapshotRelation ?? segmentRelation;
  const segmentProgressCoordinates = useMemo(
    () => buildSegmentProgressCoordinates(safeSegmentCoordinates, effectiveSegmentRelation),
    [effectiveSegmentRelation, safeSegmentCoordinates]
  );
  
  useEffect(() => {
    // Skip if map already initialized or no container
    if (!mapContainer.current || map.current) return;

    let isMounted = true;
    const token = getMapboxToken();

    async function initializeMap() {
      // Get user location if not provided and enabled
      let mapCenter: [number, number];
      if (useUserLocation && !center) {
        mapCenter = await getUserLocation();
      } else {
        mapCenter = center ?? FALLBACK_CENTER;
      }

      if (!isMounted) return;

      const containerElement = mapContainer.current;
      if (!containerElement) return;

      try {
        // Configure Mapbox with token
        if (token) {
          mapboxgl.accessToken = token;
        }

        const initialStyle = resolveMapStyle(token);
        isUsingFallbackStyle.current = typeof initialStyle !== "string";

        map.current = new mapboxgl.Map({
          container: containerElement,
          style: initialStyle,
          center: mapCenter,
          zoom,
          attributionControl: false,
        });

        const attemptOsmFallback = () => {
          if (!map.current || isUsingFallbackStyle.current || hasAttemptedFallback.current) {
            return false;
          }

          hasAttemptedFallback.current = true;
          isUsingFallbackStyle.current = true;
          setMapError(null);
          setIsLoading(true);
          map.current.setStyle(MAP_FALLBACK_STYLE);
          return true;
        };

        map.current.on("load", () => {
          setMapError(null);
          setIsLoading(false);
          if (onMapReady && map.current) {
            onMapReady(map.current);
          }
        });

        map.current.on("error", (e) => {
          const classified = classifyMapError(e);
          console.error("[Map] Runtime error", {
            classified,
            event: e,
            usingFallbackStyle: isUsingFallbackStyle.current,
          });

          if (!classified.fatal) {
            return;
          }

          if (
            (classified.kind === "fatal-auth" || classified.kind === "fatal-style") &&
            attemptOsmFallback()
          ) {
            console.warn("[Map] Switching to OSM fallback after fatal Mapbox error", {
              kind: classified.kind,
              message: classified.message,
              status: classified.status,
            });
            return;
          }

          setMapError(MAP_FATAL_ERROR_COPY);
          setIsLoading(false);
        });

        if (showControls) {
          map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
          map.current.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-right");
        }

        // Add attribution control
        map.current.addControl(
          new mapboxgl.AttributionControl({ compact: true }),
          "bottom-right"
        );
      } catch (error) {
        console.error("Map initialization error:", error);
        setMapError(MAP_FATAL_ERROR_COPY);
        setIsLoading(false);
      }
    }

    initializeMap();

    return () => {
      isMounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, showControls, onMapReady, useUserLocation]);

  // Draw ride route on map
  useEffect(() => {
    if (!map.current) return;

    const drawRoute = () => {
      if (!map.current) return;

      if (safeRouteCoordinates.length === 0) {
        clearGeoJsonLayers(map.current, [
          "ride-route-layer",
          "ride-route-layer-outline",
          "ride-route-speed-layer",
          "ride-route-speed-layer-outline",
        ]);
        removeSourceIfExists(map.current, "ride-route");
        removeSourceIfExists(map.current, "ride-route-speed");
        return;
      }

      const speedSegments = buildSpeedSegmentFeatureCollection(safeTrackSamples);
      const canRenderSpeedRoute = speedSegments.features.length >= 3;

      if (canRenderSpeedRoute) {
        upsertSegmentSpeedLayer(map.current, "ride-route-speed", "ride-route-speed-layer", speedSegments);
        clearGeoJsonLayers(map.current, ["ride-route-layer", "ride-route-layer-outline"]);
        removeSourceIfExists(map.current, "ride-route");
      } else {
        clearGeoJsonLayers(map.current, ["ride-route-speed-layer", "ride-route-speed-layer-outline"]);
        removeSourceIfExists(map.current, "ride-route-speed");

        upsertLineLayer({
          map: map.current,
          sourceId: "ride-route",
          layerId: "ride-route-layer",
          coordinates: safeRouteCoordinates,
          color: ROUTE_COLORS.live,
          width: ROUTE_WIDTHS.live,
          outlineColor: ROUTE_COLORS.outline,
          outlineWidth: ROUTE_WIDTHS.liveOutline,
        });
      }

      if (!preserveCameraOnRouteUpdates) {
        fitToCoordinates(map.current, safeRouteCoordinates, 60, 16);
      }
    };

    if (map.current.isStyleLoaded()) drawRoute();
    else map.current.once("load", drawRoute);
  }, [preserveCameraOnRouteUpdates, safeRouteCoordinates, safeTrackSamples]);

  // Draw segment route on map
  useEffect(() => {
    if (!map.current) return;

    if (!safeSegmentCoordinates.length) {
      clearGeoJsonLayers(map.current, [
        "segment-route-layer",
        "segment-route-layer-outline",
        "segment-progress-layer",
        "segment-progress-layer-outline",
        "segment-connector-layer",
      ]);
      removeSourceIfExists(map.current, "segment-route");
      removeSourceIfExists(map.current, "segment-progress");
      removeSourceIfExists(map.current, "segment-connector");
      return;
    }

    const shouldAutoFocusSegment =
      focusOnSegment &&
      !safeCurrentPosition &&
      safeRouteCoordinates.length === 0;

    const drawSegment = () => {
      if (!map.current) return;

      const segmentStatus = segmentLiveSnapshot?.status ?? "idle";
      const segmentBaseStyle = resolveSegmentBaseStyle(segmentStatus);
      const progressStyle = resolveSegmentProgressStyle(segmentStatus);

      upsertLineLayer({
        map: map.current,
        sourceId: "segment-route",
        layerId: "segment-route-layer",
        coordinates: safeSegmentCoordinates,
        color: segmentBaseStyle.color,
        width: ROUTE_WIDTHS.segment,
        outlineColor: "#f8fafc",
        outlineWidth: ROUTE_WIDTHS.segment + 3,
        dashArray: segmentBaseStyle.dashArray,
        lineOpacity: segmentBaseStyle.opacity,
      });

      if (segmentProgressCoordinates.length >= 2) {
        upsertLineLayer({
          map: map.current,
          sourceId: "segment-progress",
          layerId: "segment-progress-layer",
          coordinates: segmentProgressCoordinates,
          color: progressStyle.color,
          width: ROUTE_WIDTHS.segment,
          outlineColor: "#ffffff",
          outlineWidth: ROUTE_WIDTHS.segment + 2,
          lineOpacity: progressStyle.opacity,
        });
      } else {
        clearGeoJsonLayers(map.current, ["segment-progress-layer", "segment-progress-layer-outline"]);
        removeSourceIfExists(map.current, "segment-progress");
      }

      if (
        safeCurrentPosition &&
        effectiveSegmentRelation &&
        effectiveSegmentRelation.distanceM <= 200 &&
        effectiveSegmentRelation.distanceM >= 5
      ) {
        upsertLineLayer({
          map: map.current,
          sourceId: "segment-connector",
          layerId: "segment-connector-layer",
          coordinates: [safeCurrentPosition, effectiveSegmentRelation.projectedPoint],
          color: "#475569",
          width: 1.6,
          outlineColor: "#ffffff",
          outlineWidth: 3,
          dashArray: [0.8, 1],
          lineOpacity: 0.42,
        });
      } else {
        clearGeoJsonLayers(map.current, ["segment-connector-layer", "segment-connector-layer-outline"]);
        removeSourceIfExists(map.current, "segment-connector");
      }

      if (shouldAutoFocusSegment) {
        fitToCoordinates(map.current, safeSegmentCoordinates, 50, 15);
      }
    };

    if (map.current.isStyleLoaded()) drawSegment();
    else map.current.once("load", drawSegment);
  }, [
    safeCurrentPosition,
    focusOnSegment,
    safeRouteCoordinates.length,
    safeSegmentCoordinates,
    segmentProgressCoordinates,
    effectiveSegmentRelation,
    segmentLiveSnapshot?.status,
  ]);

  // Add markers for segment start and end points
  useEffect(() => {
    if (!map.current || !focusOnSegment) return;

    segmentMarkersRef.current.forEach((marker) => marker.remove());
    segmentMarkersRef.current = [];

    if (!safeSegmentCoordinates.length) return;

    const addMarkers = () => {
      if (!map.current) return;

      const startCoord = safeSegmentCoordinates[0];
      const startMarker = new mapboxgl.Marker({ element: createSegmentMarkerElement("Inicio", "start") })
        .setLngLat(startCoord)
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML('<div class="text-sm font-medium text-slate-900">Inicio de segmento</div>'))
        .addTo(map.current);

      const endCoord = safeSegmentCoordinates[safeSegmentCoordinates.length - 1];
      const endMarker = new mapboxgl.Marker({ element: createSegmentMarkerElement("Meta", "end") })
        .setLngLat(endCoord)
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML('<div class="text-sm font-medium text-slate-900">Fin de segmento</div>'))
        .addTo(map.current);

      segmentMarkersRef.current = [startMarker, endMarker];
    };

    if (map.current.isStyleLoaded()) addMarkers();
    else map.current.once("load", addMarkers);

    return () => {
      segmentMarkersRef.current.forEach((marker) => marker.remove());
      segmentMarkersRef.current = [];
    };
  }, [safeSegmentCoordinates, focusOnSegment]);

  // Recenter map to user location when trigger changes
  // Only if no segment is selected (segment takes priority)
  useEffect(() => {
    if (!map.current || !recenterTrigger) return;

    const shouldBlockBySegment =
      safeSegmentCoordinates.length > 0 &&
      focusOnSegment &&
      !safeCurrentPosition &&
      safeRouteCoordinates.length === 0;

    if (shouldBlockBySegment) {
      return;
    }

    async function recenter() {
      const location = await getUserLocationFn.current();
      if (map.current) {
        map.current.flyTo({
          center: location,
          zoom: MAP_DEFAULTS.zoomStreet,
          duration: MAP_DEFAULTS.flyDuration,
        });
      }
    }

    if (map.current?.isStyleLoaded()) {
      recenter();
    } else {
      map.current?.once("load", recenter);
    }
  }, [safeCurrentPosition, focusOnSegment, recenterTrigger, safeRouteCoordinates.length, safeSegmentCoordinates]);

  useEffect(() => {
    if (!map.current) return;

    if (!safeCurrentPosition) {
      currentPositionMarker.current?.remove();
      currentPositionMarker.current = null;
      return;
    }

    const mapInstance = map.current;
    const upsertCurrentPositionMarker = () => {
      if (!map.current || map.current !== mapInstance) return;

      if (!currentPositionMarker.current) {
        const el = document.createElement("div");
        el.className = "h-4 w-4 rounded-full border-2 border-white bg-brand-600 shadow-lg";
        el.style.transition = "transform 320ms linear";
        currentPositionMarker.current = new mapboxgl.Marker({ element: el })
          .setLngLat(safeCurrentPosition)
          .addTo(mapInstance);
        return;
      }

      currentPositionMarker.current.setLngLat(safeCurrentPosition);
    };

    if (mapInstance.isStyleLoaded()) {
      upsertCurrentPositionMarker();
    } else {
      mapInstance.once("load", upsertCurrentPositionMarker);
      return () => {
        mapInstance.off("load", upsertCurrentPositionMarker);
      };
    }
  }, [safeCurrentPosition]);

  useEffect(() => {
    if (!map.current || !followCurrentPosition || !safeCurrentPosition) return;

    const mapInstance = map.current;
    const followToCurrentPosition = () => {
      if (!map.current || map.current !== mapInstance) return;

      const now = Date.now();
      const shouldThrottle = now - lastFollowAtRef.current < 1_500;
      const center = map.current.getCenter();
      const centerDistanceM = center.distanceTo(
        new mapboxgl.LngLat(safeCurrentPosition[0], safeCurrentPosition[1])
      );
      if (shouldThrottle && centerDistanceM < 35) return;

      lastFollowAtRef.current = now;
      map.current.easeTo({
        center: safeCurrentPosition,
        duration: 850,
        essential: true,
        zoom: Math.max(14, map.current.getZoom())
      });
    };

    if (mapInstance.isStyleLoaded()) {
      followToCurrentPosition();
    } else {
      mapInstance.once("load", followToCurrentPosition);
      return () => {
        mapInstance.off("load", followToCurrentPosition);
      };
    }
  }, [safeCurrentPosition, followCurrentPosition]);

  useEffect(() => {
    if (!map.current || !followCurrentPosition || !onFollowInterrupted) return;

    const handleUserGesture = () => onFollowInterrupted();
    map.current.on("dragstart", handleUserGesture);
    map.current.on("rotatestart", handleUserGesture);
    map.current.on("pitchstart", handleUserGesture);

    return () => {
      map.current?.off("dragstart", handleUserGesture);
      map.current?.off("rotatestart", handleUserGesture);
      map.current?.off("pitchstart", handleUserGesture);
    };
  }, [followCurrentPosition, onFollowInterrupted]);

  const mapBody = (
    <div className={cn(
      variant === "bare" ? "relative h-full w-full" : "relative h-[320px] w-full sm:h-[360px] lg:h-[420px]",
      mapClassName
    )}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-brand-600" />
              <span className="text-sm text-slate-600">Cargando mapa...</span>
            </div>
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <p className="text-sm font-medium text-rose-600">{mapError}</p>
              <p className="mt-1 text-xs text-slate-500">Revisá la configuración del mapa o la conexión del proveedor</p>
            </div>
          </div>
        )}
        {showSegmentOverlay && !!effectiveSegmentRelation && (
          <div className="absolute left-3 top-3 z-[5] rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-[11px] text-slate-700 shadow-sm backdrop-blur-sm">
            <p className="font-semibold text-slate-800">Intento segmento</p>
            <p>Estado: {segmentLiveSnapshot ? formatSegmentStatus(segmentLiveSnapshot.status) : "referencia"}</p>
            <p>Distancia a ruta: {formatDistance(effectiveSegmentRelation.distanceM)}</p>
            <p>Progreso: {Math.round((segmentLiveSnapshot?.progressPct ?? effectiveSegmentRelation.progressPct))}%</p>
          </div>
        )}
        {showSpeedLegend && safeRouteCoordinates.length > 1 && (
          <div className="absolute bottom-3 left-3 z-[5] rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-2 text-[10px] text-slate-600 shadow-sm backdrop-blur-sm">
            <p className="font-semibold uppercase tracking-wide text-slate-700">Velocidad</p>
            <p className="mt-1 flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-sky-500" /> Baja (&lt;15)</p>
            <p className="mt-0.5 flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" /> Media (15-30)</p>
            <p className="mt-0.5 flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-orange-500" /> Alta (&gt;=30)</p>
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full" />
      </div>
  );

  if (variant === "bare") {
    return (
      <div className={cn("overflow-hidden", className)}>
        {mapBody}
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      {showHeader && (
        <div className="border-b border-slate-200/70 bg-white/70 px-4 py-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
      )}
      {mapBody}
    </Card>
  );
}

function upsertLineLayer(params: {
  map: mapboxgl.Map;
  sourceId: string;
  layerId: string;
  coordinates: [number, number][];
  color: string;
  width: number;
  outlineColor: string;
  outlineWidth: number;
  dashArray?: number[];
  lineOpacity?: number;
}) {
  const {
    map,
    sourceId,
    layerId,
    coordinates,
    color,
    width,
    outlineColor,
    outlineWidth,
    dashArray,
    lineOpacity = 0.9,
  } = params;

  const data = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates }
  } as const;

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data);
    return;
  }

  map.addSource(sourceId, { type: "geojson", data });

  map.addLayer({
    id: `${layerId}-outline`,
    type: "line",
    source: sourceId,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": outlineColor, "line-width": outlineWidth, "line-opacity": 0.5 }
  });

  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": color,
      "line-width": width,
      "line-opacity": lineOpacity,
      ...(dashArray ? { "line-dasharray": dashArray } : {})
    }
  });
}

function upsertSegmentSpeedLayer(
  map: mapboxgl.Map,
  sourceId: string,
  layerId: string,
  data: FeatureCollection<
    LineString,
    { speedKmh: number; speedBucket: "low" | "medium" | "high" }
  >
) {
  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data);
    return;
  }

  map.addSource(sourceId, { type: "geojson", data });

  map.addLayer({
    id: `${layerId}-outline`,
    type: "line",
    source: sourceId,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": 6.5,
      "line-opacity": 0.55,
    },
  });

  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": [
        "match",
        ["get", "speedBucket"],
        "low",
        "#0ea5e9",
        "medium",
        "#22c55e",
        "high",
        "#f97316",
        ROUTE_COLORS.live,
      ],
      "line-width": 4,
      "line-opacity": 0.92,
    },
  });
}

function clearGeoJsonLayers(map: mapboxgl.Map, layerIds: string[]) {
  layerIds.forEach((id) => {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
  });
}

function removeSourceIfExists(map: mapboxgl.Map, sourceId: string) {
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

function createSegmentMarkerElement(label: "Inicio" | "Meta", type: "start" | "end") {
  const container = document.createElement("div");
  container.className = "pointer-events-none flex items-center gap-1.5";

  const badge = document.createElement("span");
  badge.className =
    "rounded-md border border-slate-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm";
  badge.textContent = label;

  const dot = document.createElement("span");
  dot.className = "inline-block h-4 w-4 rounded-full border-2 border-white shadow";
  dot.style.backgroundColor = type === "start" ? "#10b981" : "#f43f5e";

  container.appendChild(badge);
  container.appendChild(dot);

  return container;
}

function resolveSegmentBaseStyle(status: SegmentLiveSnapshot["status"]): {
  color: string;
  opacity: number;
  dashArray: number[];
} {
  if (status === "active") {
    return { color: "#2563eb", opacity: 0.8, dashArray: [0.2, 0] };
  }

  if (status === "completed") {
    return { color: "#16a34a", opacity: 0.84, dashArray: [0.2, 0] };
  }

  if (status === "abandoned" || status === "invalid") {
    return { color: "#64748b", opacity: 0.72, dashArray: [1, 1.2] };
  }

  if (status === "near_start") {
    return { color: "#b45309", opacity: 0.74, dashArray: [0.9, 1.1] };
  }

  return { color: "#334155", opacity: 0.62, dashArray: [1.2, 1.4] };
}

function resolveSegmentProgressStyle(status: SegmentLiveSnapshot["status"]): {
  color: string;
  opacity: number;
} {
  if (status === "completed") {
    return { color: "#16a34a", opacity: 0.95 };
  }

  if (status === "abandoned" || status === "invalid") {
    return { color: "#e11d48", opacity: 0.82 };
  }

  return { color: "#f59e0b", opacity: 0.88 };
}

function formatSegmentStatus(status: SegmentLiveSnapshot["status"]): string {
  if (status === "near_start") return "cerca inicio";
  if (status === "active") return "activo";
  if (status === "completed") return "completado";
  if (status === "abandoned") return "abandonado";
  if (status === "invalid") return "invalido";
  return "idle";
}

function formatDistance(distanceM: number): string {
  if (distanceM >= 1000) {
    return `${(distanceM / 1000).toFixed(2)} km`;
  }
  return `${Math.round(distanceM)} m`;
}

function fitToCoordinates(
  map: mapboxgl.Map,
  coordinates: [number, number][],
  padding: number,
  maxZoom: number
) {
  if (coordinates.length < 2) return;

  const bounds = coordinates.reduce(
    (b, c) => b.extend(c),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
  );
  map.fitBounds(bounds, { padding, maxZoom });
}

// Utility function to add a route polyline to the map
export function addRouteToMap(
  map: mapboxgl.Map,
  coordinates: [number, number][],
  color: string = ROUTE_COLORS.ride,
  lineWidth: number = ROUTE_WIDTHS.standard
) {
  const safeCoordinates = filterValidCoordinates(coordinates);
  if (safeCoordinates.length < 2) return;

  const sourceId = "route-source";
  const layerId = "route-layer";

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: safeCoordinates,
      },
    });
  } else {
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: safeCoordinates,
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": color,
        "line-width": lineWidth,
        "line-opacity": 0.9,
      },
    });
  }
}

// Utility function to add markers to the map
export function addMarkersToMap(
  map: mapboxgl.Map,
  points: Array<{ coordinates: [number, number]; label?: string; color?: string }>
) {
  points.forEach((point, index) => {
    const coordinate = normalizeCoordinate(point.coordinates);
    if (!coordinate) return;

    const markerId = `marker-${index}`;

    if (document.getElementById(markerId)) return;

    const el = document.createElement("div");
    el.id = markerId;
    el.className = "w-4 h-4 rounded-full border-2 border-white shadow-lg";
    el.style.backgroundColor = point.color || ROUTE_COLORS.ride;

    new mapboxgl.Marker({ element: el })
      .setLngLat(coordinate)
      .setPopup(
        point.label
          ? new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="text-sm font-medium text-slate-900">${point.label}</div>`
            )
          : undefined
      )
      .addTo(map);
  });
}

// Utility to fit map to coordinates
export function fitMapToRoute(map: mapboxgl.Map, coordinates: [number, number][], padding = 50) {
  const safeCoordinates = filterValidCoordinates(coordinates);
  if (safeCoordinates.length === 0) return;

  const bounds = safeCoordinates.reduce(
    (bounds, coord) => bounds.extend(coord),
    new mapboxgl.LngLatBounds(safeCoordinates[0], safeCoordinates[0])
  );

  map.fitBounds(bounds, { padding, maxZoom: 15 });
}
