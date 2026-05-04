"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
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
  // Planned route props
  plannedRouteCoordinates?: [number, number][];
  destinationCoordinate?: [number, number] | null;
  plannedRouteFitBounds?: boolean;
  // Callback to expose user location from map's visual position
  onUserLocationChange?: (position: [number, number] | null) => void;
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
  plannedRouteCoordinates,
  destinationCoordinate,
  plannedRouteFitBounds = true,
  onUserLocationChange,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const getUserLocationFn = useRef<() => Promise<[number, number]>>(getUserLocation);
  const isUsingFallbackStyle = useRef(false);
  const hasAttemptedFallback = useRef(false);
  const currentPositionMarker = useRef<mapboxgl.Marker | null>(null);
  const routeMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const segmentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const plannedRouteFitBoundsDoneRef = useRef(false);
  const lastFollowAtRef = useRef(0);
  const isProgrammaticCameraMoveRef = useRef(false);
  const lastUserLocationRef = useRef<string | null>(null);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);

  const safeRouteCoordinates = useMemo(
    () => routeCoordinates ? filterValidCoordinates(routeCoordinates) : [],
    [routeCoordinates]
  );
  const safeSegmentCoordinates = useMemo(
    () => segmentCoordinates ? filterValidCoordinates(segmentCoordinates) : [],
    [segmentCoordinates]
  );
  const safePlannedRouteCoordinates = useMemo(
    () => plannedRouteCoordinates ? filterValidCoordinates(plannedRouteCoordinates) : [],
    [plannedRouteCoordinates]
  );
  const safeDestinationCoordinate = useMemo(
    () => destinationCoordinate ? normalizeCoordinate(destinationCoordinate) : null,
    [destinationCoordinate]
  );
  const safeTrackSamples = useMemo(
    () =>
      trackSamples.filter(
        (sample) => Number.isFinite(sample.lng) && Number.isFinite(sample.lat)
      ),
    [trackSamples]
  );
  const safeCurrentPosition = useMemo(() => normalizeCoordinate(currentPosition), [currentPosition]);
  const routeTailPosition = useMemo(
    () => safeRouteCoordinates.at(-1) ?? null,
    [safeRouteCoordinates]
  );
  const visualPositionStateRef = useRef<{
    currentKey: string | null;
    routeTailKey: string | null;
    position: [number, number] | null;
  }>({ currentKey: null, routeTailKey: null, position: null });
  const visualCurrentPosition = useMemo(() => {
    const currentKey = safeCurrentPosition ? coordinateKey(safeCurrentPosition) : null;
    const routeTailKey = routeTailPosition ? coordinateKey(routeTailPosition) : null;
    const previous = visualPositionStateRef.current;

    const position =
      safeCurrentPosition && currentKey !== previous.currentKey
        ? safeCurrentPosition
        : routeTailPosition && routeTailKey !== previous.routeTailKey
          ? routeTailPosition
          : safeCurrentPosition ?? routeTailPosition;

    visualPositionStateRef.current = { currentKey, routeTailKey, position };
    return position;
  }, [routeTailPosition, safeCurrentPosition]);

  // Notify parent component of user location changes (for route planning)
  useEffect(() => {
    if (!onUserLocationChange) return;

    const currentKey = visualCurrentPosition ? coordinateKey(visualCurrentPosition) : null;
    
    // Only call callback if position changed
    if (currentKey !== lastUserLocationRef.current) {
      lastUserLocationRef.current = currentKey;
      onUserLocationChange(visualCurrentPosition);
    }
  }, [visualCurrentPosition, onUserLocationChange]);

  const currentPositionBearing = useMemo(
    () => resolveCurrentPositionBearing(safeTrackSamples, safeRouteCoordinates, visualCurrentPosition),
    [safeRouteCoordinates, safeTrackSamples, visualCurrentPosition]
  );
  const segmentRelation = useMemo(
    () =>
      visualCurrentPosition && safeSegmentCoordinates.length >= 2
        ? computeSegmentRelation(visualCurrentPosition, safeSegmentCoordinates)
        : null,
    [safeSegmentCoordinates, visualCurrentPosition]
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
          
          // Create and store GeolocateControl reference
          const geolocate = new mapboxgl.GeolocateControl({
            trackUserLocation: true,
            showUserLocation: true,
          });
          geolocateControlRef.current = geolocate;
          map.current.addControl(geolocate, "top-right");
          
          // Listen to geolocate events to notify parent of position changes
          geolocate.on("geolocate", (e: { coords: { longitude: number; latitude: number } }) => {
            const newPosition: [number, number] = [e.coords.longitude, e.coords.latitude];
            const key = coordinateKey(newPosition);
            if (key !== lastUserLocationRef.current && onUserLocationChange) {
              lastUserLocationRef.current = key;
              onUserLocationChange(newPosition);
            }
          });
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

      if (safeRouteCoordinates.length < 2) {
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
      const canRenderSpeedRoute = showSpeedLegend && speedSegments.features.length >= 1;

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
          width: 4.5,
          outlineColor: "#0f172a",
          outlineWidth: 8,
          outlineOpacity: 0.72,
        });
      }

      if (!preserveCameraOnRouteUpdates) {
        fitToCoordinates(map.current, safeRouteCoordinates, 60, 16, isProgrammaticCameraMoveRef);
      }
    };

    if (map.current.isStyleLoaded()) drawRoute();
    else map.current.once("load", drawRoute);
  }, [preserveCameraOnRouteUpdates, safeRouteCoordinates, safeTrackSamples, showSpeedLegend]);

  // Draw planned route on map (route before starting ride)
  useEffect(() => {
    if (!map.current) return;

    const drawPlannedRoute = () => {
      if (!map.current) return;

      // Clear previous planned route
      clearGeoJsonLayers(map.current, [
        "planned-route-layer",
        "planned-route-layer-outline",
      ]);
      removeSourceIfExists(map.current, "planned-route");

      // Remove previous destination marker
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }

      if (safePlannedRouteCoordinates.length < 2 || !safeDestinationCoordinate) {
        plannedRouteFitBoundsDoneRef.current = false;
        return;
      }

      // Draw planned route with distinct style (dashed, purple/blue)
      upsertLineLayer({
        map: map.current,
        sourceId: "planned-route",
        layerId: "planned-route-layer",
        coordinates: safePlannedRouteCoordinates,
        color: "#8b5cf6", // Purple/violet
        width: 3.5,
        outlineColor: "#ffffff",
        outlineWidth: 6,
        outlineOpacity: 0.6,
        dashArray: [0.8, 0.4],
        lineOpacity: 0.85,
      });

      // Add destination marker
      const markerEl = createDestinationMarkerElement();
      destinationMarkerRef.current = new mapboxgl.Marker({ element: markerEl })
        .setLngLat(safeDestinationCoordinate)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            '<div class="text-sm font-medium text-slate-900">Destino</div>'
          )
        )
        .addTo(map.current);

      // Fit bounds to show full planned route (only on initial calculation)
      if (plannedRouteFitBounds && !plannedRouteFitBoundsDoneRef.current && safeRouteCoordinates.length === 0) {
        const allCoords = [
          ...safePlannedRouteCoordinates,
          safeDestinationCoordinate,
        ];
        if (safeCurrentPosition) {
          allCoords.push(safeCurrentPosition);
        }
        fitToCoordinates(map.current, allCoords, 60, 14, isProgrammaticCameraMoveRef);
        plannedRouteFitBoundsDoneRef.current = true;
      }
    };

    if (map.current.isStyleLoaded()) drawPlannedRoute();
    else map.current.once("load", drawPlannedRoute);
  }, [
    plannedRouteFitBounds,
    safePlannedRouteCoordinates,
    safeDestinationCoordinate,
    safeCurrentPosition,
    safeRouteCoordinates.length,
  ]);

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
      !visualCurrentPosition &&
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
        visualCurrentPosition &&
        effectiveSegmentRelation &&
        effectiveSegmentRelation.distanceM <= 200 &&
        effectiveSegmentRelation.distanceM >= 5
      ) {
        upsertLineLayer({
          map: map.current,
          sourceId: "segment-connector",
          layerId: "segment-connector-layer",
          coordinates: [visualCurrentPosition, effectiveSegmentRelation.projectedPoint],
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
        fitToCoordinates(map.current, safeSegmentCoordinates, 50, 15, isProgrammaticCameraMoveRef);
      }
    };

    if (map.current.isStyleLoaded()) drawSegment();
    else map.current.once("load", drawSegment);
  }, [
    focusOnSegment,
    safeRouteCoordinates.length,
    safeSegmentCoordinates,
    segmentProgressCoordinates,
    effectiveSegmentRelation,
    segmentLiveSnapshot?.status,
    visualCurrentPosition,
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

  // Add static ride start/end markers without interfering with live recording markers.
  useEffect(() => {
    if (!map.current) return;

    routeMarkersRef.current.forEach((marker) => marker.remove());
    routeMarkersRef.current = [];

    if (safeCurrentPosition || safeRouteCoordinates.length < 2) return;

    const mapInstance = map.current;
    const addMarkers = () => {
      if (!map.current || map.current !== mapInstance) return;

      const startCoord = safeRouteCoordinates[0];
      const startMarker = new mapboxgl.Marker({ element: createRouteMarkerElement("Inicio", "start") })
        .setLngLat(startCoord)
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML('<div class="text-sm font-medium text-slate-900">Inicio de rodada</div>'))
        .addTo(mapInstance);

      const endCoord = safeRouteCoordinates[safeRouteCoordinates.length - 1];
      const endMarker = new mapboxgl.Marker({ element: createRouteMarkerElement("Fin", "end") })
        .setLngLat(endCoord)
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML('<div class="text-sm font-medium text-slate-900">Fin de rodada</div>'))
        .addTo(mapInstance);

      routeMarkersRef.current = [startMarker, endMarker];
    };

    if (mapInstance.isStyleLoaded()) addMarkers();
    else mapInstance.once("load", addMarkers);

    return () => {
      mapInstance.off("load", addMarkers);
      routeMarkersRef.current.forEach((marker) => marker.remove());
      routeMarkersRef.current = [];
    };
  }, [safeCurrentPosition, safeRouteCoordinates]);

  // Recenter map to user location when trigger changes
  // Only if no segment is selected (segment takes priority)
  useEffect(() => {
    if (!map.current || !recenterTrigger) return;

    const shouldBlockBySegment =
      safeSegmentCoordinates.length > 0 &&
      focusOnSegment &&
      !visualCurrentPosition &&
      safeRouteCoordinates.length === 0;

    if (shouldBlockBySegment) {
      return;
    }

    async function recenter() {
      const location = visualCurrentPosition ?? await getUserLocationFn.current();
      if (map.current) {
        runProgrammaticCameraMove(isProgrammaticCameraMoveRef, () => map.current?.flyTo({
          center: location,
          zoom: MAP_DEFAULTS.zoomStreet,
          duration: MAP_DEFAULTS.flyDuration,
        }));
      }
    }

    if (map.current?.isStyleLoaded()) {
      recenter();
    } else {
      map.current?.once("load", recenter);
    }
  }, [focusOnSegment, recenterTrigger, safeRouteCoordinates.length, safeSegmentCoordinates, visualCurrentPosition]);

  useEffect(() => {
    if (!map.current) return;

    if (!visualCurrentPosition) {
      currentPositionMarker.current?.remove();
      currentPositionMarker.current = null;
      return;
    }

    const mapInstance = map.current;
    const upsertCurrentPositionMarker = () => {
      if (!map.current || map.current !== mapInstance) return;

      if (!currentPositionMarker.current) {
        const el = createCurrentPositionMarkerElement(currentPositionBearing);
        currentPositionMarker.current = new mapboxgl.Marker({ element: el })
          .setLngLat(visualCurrentPosition)
          .addTo(mapInstance);
        return;
      }

      currentPositionMarker.current.setLngLat(visualCurrentPosition);
      updateCurrentPositionMarkerBearing(currentPositionMarker.current.getElement(), currentPositionBearing);
    };

    if (mapInstance.isStyleLoaded()) {
      upsertCurrentPositionMarker();
    } else {
      mapInstance.once("load", upsertCurrentPositionMarker);
      return () => {
        mapInstance.off("load", upsertCurrentPositionMarker);
      };
    }
  }, [currentPositionBearing, visualCurrentPosition]);

  useEffect(() => {
    if (!map.current || !followCurrentPosition || !visualCurrentPosition) return;

    const mapInstance = map.current;
    const followToCurrentPosition = () => {
      if (!map.current || map.current !== mapInstance) return;

      const now = Date.now();
      const shouldThrottle = now - lastFollowAtRef.current < 1_500;
      const center = map.current.getCenter();
      const centerDistanceM = center.distanceTo(
        new mapboxgl.LngLat(visualCurrentPosition[0], visualCurrentPosition[1])
      );
      if (shouldThrottle && centerDistanceM < 35) return;

      lastFollowAtRef.current = now;
      const currentZoom = map.current.getZoom();
      const shouldAdjustZoom = currentZoom < 15.5 || centerDistanceM > 140;
      runProgrammaticCameraMove(isProgrammaticCameraMoveRef, () => map.current?.easeTo({
        center: visualCurrentPosition,
        duration: 850,
        essential: true,
        ...(shouldAdjustZoom ? { zoom: Math.max(16.5, currentZoom) } : {})
      }));
    };

    if (mapInstance.isStyleLoaded()) {
      followToCurrentPosition();
    } else {
      mapInstance.once("load", followToCurrentPosition);
      return () => {
        mapInstance.off("load", followToCurrentPosition);
      };
    }
  }, [followCurrentPosition, visualCurrentPosition]);

  useEffect(() => {
    if (!map.current || !followCurrentPosition || !onFollowInterrupted) return;

    const handleUserGesture = () => onFollowInterrupted();
    const handleUserZoom = (event: mapboxgl.MapboxEvent & { originalEvent?: Event }) => {
      if (event.originalEvent && !isProgrammaticCameraMoveRef.current) {
        onFollowInterrupted();
      }
    };
    map.current.on("dragstart", handleUserGesture);
    map.current.on("rotatestart", handleUserGesture);
    map.current.on("pitchstart", handleUserGesture);
    map.current.on("zoomstart", handleUserZoom);

    return () => {
      map.current?.off("dragstart", handleUserGesture);
      map.current?.off("rotatestart", handleUserGesture);
      map.current?.off("pitchstart", handleUserGesture);
      map.current?.off("zoomstart", handleUserZoom);
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
            <p className="mt-1 flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-sky-500" /> Baja (&lt;30)</p>
            <p className="mt-0.5 flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" /> Media (30-55)</p>
            <p className="mt-0.5 flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-orange-500" /> Alta (&gt;55)</p>
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
  outlineOpacity?: number;
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
    outlineOpacity = 0.5,
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
    if (map.getLayer(`${layerId}-outline`)) {
      map.setPaintProperty(`${layerId}-outline`, "line-color", outlineColor);
      map.setPaintProperty(`${layerId}-outline`, "line-width", outlineWidth);
      map.setPaintProperty(`${layerId}-outline`, "line-opacity", outlineOpacity);
    }
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "line-color", color);
      map.setPaintProperty(layerId, "line-width", width);
      map.setPaintProperty(layerId, "line-opacity", lineOpacity);
    }
    return;
  }

  map.addSource(sourceId, { type: "geojson", data });

  map.addLayer({
    id: `${layerId}-outline`,
    type: "line",
    source: sourceId,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": outlineColor, "line-width": outlineWidth, "line-opacity": outlineOpacity }
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
    { speedKmh: number | null; speedBucket: "low" | "medium" | "high" | "unknown" }
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
      "line-color": "#0f172a",
      "line-width": 8,
      "line-opacity": 0.68,
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
        "unknown",
        "#94a3b8",
        ROUTE_COLORS.live,
      ],
      "line-width": 4.5,
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

function createRouteMarkerElement(label: "Inicio" | "Fin", type: "start" | "end") {
  const container = document.createElement("div");
  container.className = "pointer-events-none flex items-center gap-1.5";

  const dot = document.createElement("span");
  dot.className = "inline-block h-4 w-4 rounded-full border-2 border-white shadow";
  dot.style.backgroundColor = type === "start" ? "#2563eb" : "#dc2626";

  const badge = document.createElement("span");
  badge.className =
    "rounded-md border border-slate-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm";
  badge.textContent = label;

  if (type === "start") {
    container.appendChild(badge);
    container.appendChild(dot);
  } else {
    container.appendChild(dot);
    container.appendChild(badge);
  }

  return container;
}

function createDestinationMarkerElement() {
  const container = document.createElement("div");
  container.className = "pointer-events-none flex items-center gap-1.5";

  const pin = document.createElement("div");
  pin.className = "relative";
  
  // Pin shape using CSS
  const pinHead = document.createElement("span");
  pinHead.className = "block h-5 w-5 rounded-full border-2 border-white shadow-lg";
  pinHead.style.backgroundColor = "#8b5cf6"; // Purple
  pinHead.style.boxShadow = "0 2px 8px rgba(139, 92, 246, 0.4)";
  
  const pinPoint = document.createElement("span");
  pinPoint.className = "absolute left-1/2 top-5 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-purple-500";
  pinPoint.style.borderWidth = "6px";

  pin.appendChild(pinHead);
  pin.appendChild(pinPoint);
  
  const label = document.createElement("span");
  label.className =
    "rounded-md border border-slate-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm";
  label.textContent = "Destino";

  container.appendChild(pin);
  container.appendChild(label);

  return container;
}

function createCurrentPositionMarkerElement(bearing: number | null) {
  const container = document.createElement("div");
  container.className = "relative flex h-9 w-9 items-center justify-center";
  container.style.filter = "drop-shadow(0 10px 18px rgba(13,148,136,0.38))";

  const glow = document.createElement("span");
  glow.className = "absolute h-9 w-9 rounded-full bg-teal-400/25";
  glow.style.boxShadow = "0 0 22px rgba(20,184,166,0.55)";

  const marker = document.createElement("span");
  marker.dataset.currentPositionBearing = "true";
  marker.className = "relative flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-white bg-teal-600 shadow-[0_4px_14px_rgba(15,23,42,0.28)]";
  marker.style.transition = "transform 260ms ease-out";

  const arrow = document.createElement("span");
  arrow.className = "block h-0 w-0 border-x-[5px] border-b-[11px] border-x-transparent border-b-white";
  arrow.style.transform = "translateY(-1px)";

  marker.appendChild(arrow);
  container.appendChild(glow);
  container.appendChild(marker);
  updateCurrentPositionMarkerBearing(container, bearing);

  return container;
}

function updateCurrentPositionMarkerBearing(element: HTMLElement, bearing: number | null) {
  const marker = element.querySelector<HTMLElement>("[data-current-position-bearing]");
  if (!marker) return;

  marker.style.transform = typeof bearing === "number" ? `rotate(${bearing}deg)` : "rotate(0deg)";
}

function coordinateKey(coordinate: [number, number]): string {
  return `${coordinate[0].toFixed(7)},${coordinate[1].toFixed(7)}`;
}

function resolveCurrentPositionBearing(
  trackSamples: TrackSpeedSample[],
  routeCoordinates: [number, number][],
  visualPosition: [number, number] | null
): number | null {
  const lastHeading = [...trackSamples]
    .reverse()
    .map((sample) => (sample as TrackSpeedSample & { headingDegrees?: unknown; heading?: unknown }).headingDegrees ??
      (sample as TrackSpeedSample & { heading?: unknown }).heading)
    .find((heading): heading is number => typeof heading === "number" && Number.isFinite(heading) && heading >= 0 && heading <= 360);

  if (typeof lastHeading === "number") {
    return lastHeading;
  }

  const coordinatesForBearing = visualPosition
    ? appendVisualPositionForBearing(routeCoordinates, visualPosition)
    : routeCoordinates;

  return resolveBearingFromCoordinates(coordinatesForBearing);
}

function appendVisualPositionForBearing(
  routeCoordinates: [number, number][],
  visualPosition: [number, number]
): [number, number][] {
  const lastRouteCoordinate = routeCoordinates.at(-1);
  if (lastRouteCoordinate && coordinateKey(lastRouteCoordinate) === coordinateKey(visualPosition)) {
    return routeCoordinates;
  }

  return [...routeCoordinates, visualPosition];
}

function resolveBearingFromCoordinates(coordinates: [number, number][]): number | null {
  if (coordinates.length < 2) return null;

  const to = coordinates[coordinates.length - 1];
  const minDistanceM = 2;

  for (let index = coordinates.length - 2; index >= 0; index -= 1) {
    const from = coordinates[index];
    const distanceM = new mapboxgl.LngLat(from[0], from[1]).distanceTo(new mapboxgl.LngLat(to[0], to[1]));
    if (distanceM >= minDistanceM && distanceM <= 250) {
      return calculateBearingDegrees(from, to);
    }
  }

  return null;
}

function calculateBearingDegrees(from: [number, number], to: [number, number]): number {
  const fromLat = degreesToRadians(from[1]);
  const toLat = degreesToRadians(to[1]);
  const deltaLng = degreesToRadians(to[0] - from[0]);
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  return (radiansToDegrees(Math.atan2(y, x)) + 360) % 360;
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function radiansToDegrees(value: number): number {
  return value * 180 / Math.PI;
}

function runProgrammaticCameraMove(
  flagRef: MutableRefObject<boolean>,
  move: () => void
) {
  flagRef.current = true;
  move();
  window.setTimeout(() => {
    flagRef.current = false;
  }, MAP_DEFAULTS.flyDuration + 120);
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
  maxZoom: number,
  programmaticMoveRef?: MutableRefObject<boolean>
) {
  if (coordinates.length < 2) return;

  const bounds = coordinates.reduce(
    (b, c) => b.extend(c),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
  );
  if (programmaticMoveRef) {
    runProgrammaticCameraMove(programmaticMoveRef, () => map.fitBounds(bounds, { padding, maxZoom }));
    return;
  }

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
