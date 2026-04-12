"use client";

import { useEffect, useRef, useState } from "react";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { Card } from "@/features/shared/ui/card";

interface MapContainerProps {
  title?: string;
  center?: [number, number];
  zoom?: number;
  showControls?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
  useUserLocation?: boolean;
  routeCoordinates?: [number, number][];
  segmentCoordinates?: [number, number][];
}

const DEFAULT_ZOOM = 12;

// Tile server configuration - production ready
const TILE_LAYER = {
  url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 20,
};

const FALLBACK_CENTER: [number, number] = [-34.6037, -58.3816]; // Buenos Aires

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
  onMapReady,
  useUserLocation = true,
  routeCoordinates,
  segmentCoordinates,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip if map already initialized or no container
    if (!mapContainer.current || map.current) return;

    let isMounted = true;

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
        map.current = new maplibregl.Map({
          container: containerElement,
          style: {
            version: 8,
            sources: {
              "carto-voyager": {
                type: "raster",
                tiles: [TILE_LAYER.url],
                tileSize: 256,
                attribution: TILE_LAYER.attribution,
                maxzoom: TILE_LAYER.maxZoom,
              },
            },
            layers: [
              {
                id: "carto-voyager-layer",
                type: "raster",
                source: "carto-voyager",
                minzoom: 0,
                maxzoom: 20,
              },
            ],
          },
          center: mapCenter,
          zoom,
          attributionControl: false,
        });

        map.current.on("load", () => {
          setIsLoading(false);
          if (onMapReady && map.current) {
            onMapReady(map.current);
          }
        });

        map.current.on("error", (e) => {
          console.error("Map error:", e);
          setMapError("Error al cargar el mapa");
          setIsLoading(false);
        });

        if (showControls) {
          map.current.addControl(new maplibregl.NavigationControl(), "top-right");
          map.current.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
        }
      } catch (error) {
        console.error("Map initialization error:", error);
        setMapError("Error al inicializar el mapa");
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
  }, [center, zoom, showControls, onMapReady, useUserLocation, routeCoordinates, segmentCoordinates]);

  // Draw segment route on map
  useEffect(() => {
    if (!map.current || !segmentCoordinates || segmentCoordinates.length === 0) return;

    const sourceId = "segment-route";
    const layerId = "segment-route-layer";

    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: segmentCoordinates },
      });
    } else {
      map.current.addSource(sourceId, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: segmentCoordinates } },
      });

      map.current.addLayer({
        id: `${layerId}-outline`,
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.5 },
      });

      map.current.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#f59e0b", "line-width": 5, "line-opacity": 0.9 },
      });
    }

    // Fit to segment
    if (segmentCoordinates.length > 1) {
      const bounds = segmentCoordinates.reduce(
        (b, c) => b.extend(c as any),
        new maplibregl.LngLatBounds(segmentCoordinates[0], segmentCoordinates[0])
      );
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [segmentCoordinates]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200/70 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="relative h-80 w-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-brand-600" />
              <span className="text-sm text-slate-600">Cargando mapa...</span>
            </div>
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <p className="text-sm font-medium text-rose-600">{mapError}</p>
              <p className="mt-1 text-xs text-slate-500">Verifica tu conexión a internet</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full" />
      </div>
    </Card>
  );
}

// Utility function to add a route polyline to the map
export function addRouteToMap(
  map: maplibregl.Map,
  coordinates: [number, number][],
  color: string = "#0d9488",
  lineWidth: number = 4
) {
  const sourceId = "route-source";
  const layerId = "route-layer";

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates,
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
          coordinates,
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
  map: maplibregl.Map,
  points: Array<{ coordinates: [number, number]; label?: string; color?: string }>
) {
  points.forEach((point, index) => {
    const markerId = `marker-${index}`;

    if (document.getElementById(markerId)) return;

    const el = document.createElement("div");
    el.id = markerId;
    el.className = "w-4 h-4 rounded-full border-2 border-white shadow-lg";
    el.style.backgroundColor = point.color || "#0d9488";

    new maplibregl.Marker({ element: el })
      .setLngLat(point.coordinates)
      .setPopup(
        point.label
          ? new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div class="text-sm font-medium text-slate-900">${point.label}</div>`
            )
          : undefined
      )
      .addTo(map);
  });
}

// Utility to fit map to coordinates
export function fitMapToRoute(map: maplibregl.Map, coordinates: [number, number][], padding = 50) {
  if (coordinates.length === 0) return;

  const bounds = coordinates.reduce(
    (bounds, coord) => bounds.extend(coord),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
  );

  map.fitBounds(bounds, { padding, maxZoom: 15 });
}