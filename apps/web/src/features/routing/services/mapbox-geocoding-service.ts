/**
 * Mapbox Geocoding Service
 * Handles place search and autocomplete for destination selection
 */

import { getMapboxToken } from "@/features/maps/lib/map-config";
import type { GeocodingResult } from "../types/planned-route";

const GEOCODING_API_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

/**
 * Search for places using Mapbox Geocoding API
 * @param query - Search query string
 * @param proximity - Optional [lng, lat] to prioritize nearby results
 * @param limit - Max number of results (default 5)
 * @returns Array of geocoding results
 */
export async function searchPlaces(
  query: string,
  proximity?: [number, number],
  limit: number = 5
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const token = getMapboxToken();
  
  if (!token) {
    console.warn("[Geocoding] No Mapbox token available");
    return [];
  }

  const params = new URLSearchParams({
    access_token: token,
    limit: limit.toString(),
    language: "es",
    types: "address,poi,place,locality,neighborhood",
  });

  if (proximity && proximity.length === 2) {
    params.set("proximity", `${proximity[0]},${proximity[1]}`);
  }

  const url = `${GEOCODING_API_URL}/${encodeURIComponent(query.trim())}.json?${params}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error("[Geocoding] API error:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    return data.features.map((feature: {
      place_name: string;
      text: string;
      geometry: { coordinates: [number, number] };
      id: string;
      context?: Array<{ id: string; text: string }>;
    }) => {
      // Build address from context
      let address = feature.place_name;
      // Remove the main name from the full address for cleaner display
      if (feature.text && address.startsWith(feature.text)) {
        address = address.substring(feature.text.length).trim();
        // Remove leading comma or dash
        address = address.replace(/^[,–-]\s*/, "").trim();
      }

      return {
        name: feature.text,
        address: address || feature.place_name,
        coordinate: feature.geometry.coordinates as [number, number],
        placeId: feature.id,
      };
    });
  } catch (error) {
    console.error("[Geocoding] Request failed:", error);
    return [];
  }
}

/**
 * Check if Mapbox geocoding is available
 */
export function isGeocodingAvailable(): boolean {
  const token = getMapboxToken();
  return Boolean(token);
}