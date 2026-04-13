/**
 * Mapbox configuration for Apex Ride
 * 
 * This module centralizes all Mapbox configuration including:
 * - Access token management
 * - Map styles
 * - Default settings
 * - Utility functions
 * 
 * IMPORTANT: Set NEXT_PUBLIC_MAPBOX_TOKEN in your environment variables
 * Get your token at: https://account.mapbox.com/access-tokens/
 */

import type { Map } from "mapbox-gl";

type RasterStyleSpecification = {
  version: 8;
  name: string;
  sources: {
    osm: {
      type: "raster";
      tiles: string[];
      tileSize: number;
      attribution: string;
      maxzoom: number;
    };
  };
  layers: Array<{
    id: string;
    type: "raster";
    source: "osm";
    minzoom?: number;
    maxzoom?: number;
  }>;
};

export type ResolvedMapStyle = string | RasterStyleSpecification;

/**
 * Get the Mapbox access token from environment variables
 * @throws Error if token is not configured
 */
export function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!token) {
    console.warn(
      "[Mapbox] WARNING: NEXT_PUBLIC_MAPBOX_TOKEN not configured. " +
      "Mapbox features will not work. " +
      "Set NEXT_PUBLIC_MAPBOX_TOKEN in your .env.local file."
    );
    return "";
  }
  
  return token;
}

/**
 * Mapbox style URLs and configurations
 * Using Mapbox standard styles for premium look
 */
export const MAP_STYLES = {
  /**
   * Standard streets style - clean and modern
   * Good for general navigation and route visualization
   */
  streets: "mapbox://styles/mapbox/streets-v12",
  
  /**
   * Navigation night style - optimized for low-light conditions
   * Good for evening rides
   */
  navigationNight: "mapbox://styles/mapbox/navigation-night-v2",
  
  /**
   * Outdoors style - optimized for outdoor activities
   * Good for cycling, hiking routes
   */
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  
  /**
   * Light style - clean, minimal light theme
   * Good for overlaying routes with high contrast
   */
  light: "mapbox://styles/mapbox/light-v11",
  
  /**
   * Dark style - minimal dark theme
   * Good for dark mode UI
   */
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

export const MAP_FALLBACK_STYLE: RasterStyleSpecification = {
  version: 8,
  name: "Apex Ride OSM Fallback",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

export function resolveMapStyle(token?: string | null): ResolvedMapStyle {
  return token ? MAP_STYLES.streets : MAP_FALLBACK_STYLE;
}

/**
 * Default map configuration
 */
export const MAP_DEFAULTS = {
  /** Default zoom level */
  zoom: 12,
  
  /** Zoom level for street-level view */
  zoomStreet: 16,
  
  /** Zoom level for showing entire route */
  zoomRoute: 14,
  
  /** Default center (Buenos Aires, Argentina) */
  center: [-58.3816, -34.6037] as [number, number],
  
  /** Padding for fitBounds (in pixels) */
  padding: 50,
  
  /** Maximum zoom for auto-fit */
  maxZoom: 18,
  
  /** Animation duration in ms */
  flyDuration: 1000,
  
  /** Attribution position */
  attributionPosition: "bottom-right" as const,
} as const;

/**
 * Route visualization colors
 * Coherent with Apex Ride branding
 */
export const ROUTE_COLORS = {
  /** Default ride route color - teal/brand */
  ride: "#0d9488",
  
  /** Segment route color - amber */
  segment: "#f59e0b",
  
  /** Live tracking route color */
  live: "#0d9488",
  
  /** Route outline color (for contrast) */
  outline: "#ffffff",
  
  /** Start marker color - emerald */
  start: "#10b981",
  
  /** End marker color - rose */
  end: "#f43f5e",
  
  /** Current position marker - brand */
  current: "#1488cc",
} as const;

/**
 * Route line widths
 */
export const ROUTE_WIDTHS = {
  /** Standard route width */
  standard: 4,
  
  /** Route width with outline */
  outline: 7,
  
  /** Segment route width */
  segment: 5,
  
  /** Live tracking width */
  live: 4,
  
  /** Live tracking outline width */
  liveOutline: 6,
} as const;

/**
 * Convert MapLibre map instance to Mapbox
 * This helps with migration - some utilities work with both
 */
export type AnyMap = Map;

/**
 * Create standard popup HTML content
 */
export function createPopupContent(title: string): string {
  return `<div class="text-sm font-medium text-slate-900">${title}</div>`;
}

/**
 * Create marker element with custom styling
 */
export function createMarkerElement(
  color: string,
  size: "sm" | "md" | "lg" = "md",
  pulse = false
): HTMLDivElement {
  const sizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };
  
  const el = document.createElement("div");
  el.className = `rounded-full border-2 border-white shadow-lg ${sizes[size]}`;
  el.style.backgroundColor = color;
  
  if (pulse) {
    el.classList.add("animate-pulse");
  }
  
  return el;
}

/**
 * Create start/end marker element
 */
export function createEndpointMarker(
  type: "start" | "end",
  label: string
): HTMLDivElement {
  const colors = {
    start: ROUTE_COLORS.start,
    end: ROUTE_COLORS.end,
  };
  
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold" 
         style="background-color: ${colors[type]}">
      ${type === "start" ? "I" : "F"}
    </div>
  `;
  
  return el.firstElementChild as HTMLDivElement;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(
  lng: number,
  lat: number,
  precision = 5
): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Calculate bounds from coordinates array
 */
export function calculateBounds(
  coordinates: [number, number][]
): [[number, number], [number, number]] | null {
  if (coordinates.length === 0) return null;
  
  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];
  
  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Validate coordinate tuple
 */
export function isValidCoordinate(
  coordinate: [number, number] | undefined
): coordinate is [number, number] {
  if (!coordinate) return false;
  const [lng, lat] = coordinate;
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Filter invalid coordinates from array
 */
export function filterValidCoordinates(
  coordinates: ([number, number] | undefined)[]
): [number, number][] {
  return coordinates.filter(isValidCoordinate);
}

/**
 * Mapbox attribution text
 */
export const MAP_ATTRIBUTION = `
  &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors
  &copy; <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a>
`;
