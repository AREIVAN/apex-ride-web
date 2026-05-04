"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Card } from "@/features/shared/ui/card";
import { Button } from "@/features/shared/ui/button";
import { searchPlaces, isGeocodingAvailable } from "../services/mapbox-geocoding-service";
import type { GeocodingResult } from "../types/planned-route";
import { cn } from "@/lib/utils/cn";

interface DestinationSearchBoxProps {
  onDestinationSelect: (result: GeocodingResult) => void;
  currentPosition?: [number, number] | null;
  className?: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export function DestinationSearchBox({
  onDestinationSelect,
  currentPosition,
  className,
  disabled = false,
}: DestinationSearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasToken = isGeocodingAvailable();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!hasToken || query.length < MIN_QUERY_LENGTH || disabled) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const searchResults = await searchPlaces(
          query,
          currentPosition ?? undefined,
          6
        );
        setResults(searchResults);
        setShowResults(searchResults.length > 0);
      } catch (err) {
        console.error("[Search] Failed to search:", err);
        setError("Error al buscar");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, currentPosition, hasToken, disabled]);

  const handleSelect = useCallback((result: GeocodingResult) => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    onDestinationSelect(result);
  }, [onDestinationSelect]);

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Card className={cn("relative p-3", className)}>
      {!hasToken && (
        <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠️ Búsqueda de destinos requiere Mapbox token configurado en NEXT_PUBLIC_MAPBOX_TOKEN
        </div>
      )}

      {hasToken && (
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="Buscar destino..."
                disabled={disabled}
                className={cn(
                  "w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-8 text-sm",
                  "placeholder:text-slate-400",
                  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  error && "border-rose-400"
                )}
                aria-label="Buscar destino"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Limpiar búsqueda"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
            </div>
          )}

          {/* Results dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map((result, index) => (
                <button
                  key={result.placeId || index}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(result);
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 text-left hover:bg-slate-50",
                    "border-b border-slate-100 last:border-b-0"
                  )}
                >
                  <p className="truncate text-sm font-medium text-slate-900">
                    {result.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {result.address}
                  </p>
                  {result.distanceM && (
                    <p className="mt-0.5 text-xs text-brand-600">
                      ~{result.distanceM >= 1000 
                        ? `${(result.distanceM / 1000).toFixed(1)} km` 
                        : `${Math.round(result.distanceM)} m`}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {showResults && query.length >= MIN_QUERY_LENGTH && results.length === 0 && !isLoading && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-sm text-slate-500 shadow-lg">
              No se encontraron lugares
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-rose-600">{error}</p>
      )}
    </Card>
  );
}