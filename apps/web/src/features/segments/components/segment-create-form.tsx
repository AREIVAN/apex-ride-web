"use client";

import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { Input } from "@/features/shared/ui/input";

import { createSegmentAction, type CreateSegmentActionState } from "../actions/create-segment-action";

interface Waypoint {
  id: string;
  lng: number;
  lat: number;
  label: string;
}

interface SegmentCreatorMapProps {
  waypoints: Waypoint[];
  onWaypointsChange: (waypoints: Waypoint[]) => void;
}

const TILE_LAYER = {
  url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  attribution: '&copy; OpenStreetMap &copy; CARTO',
};

const FALLBACK_CENTER: [number, number] = [-34.6037, -58.3816];

function getUserLocation(): Promise<[number, number]> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(FALLBACK_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.longitude, position.coords.latitude]),
      () => resolve(FALLBACK_CENTER),
      { timeout: 10000 }
    );
  });
}

export function SegmentCreatorMap({ waypoints, onWaypointsChange }: SegmentCreatorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const waypointsRef = useRef(waypoints);
  const onWaypointsChangeRef = useRef(onWaypointsChange);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Keep ref updated with latest waypoints
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  useEffect(() => {
    onWaypointsChangeRef.current = onWaypointsChange;
  }, [onWaypointsChange]);

  // Fetch route from our API which calls OSRM server-side
  const fetchRoute = useCallback(async () => {
    if (waypoints.length < 2) return;

    setIsLoadingRoute(true);
    console.log("[SegmentCreatorMap] Fetching route for waypoints:", waypoints);

    try {
      const response = await fetch("/api/osrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waypoints }),
      });

      const data = await response.json();
      console.log("[SegmentCreatorMap] Route API response:", data);

      if (data.route && data.route.length > 0) {
        setRouteGeometry(data.route);
        console.log("[SegmentCreatorMap] Route geometry set:", data.route.length, "points");
      } else {
        console.warn("[SegmentCreatorMap] No route in response, using waypoints directly");
        const directRoute = waypoints.map(wp => [wp.lng, wp.lat] as [number, number]);
        setRouteGeometry(directRoute);
      }
    } catch (error) {
      console.error("[SegmentCreatorMap] Route fetch error:", error);
      // Fallback: use waypoints directly
      const directRoute = waypoints.map(wp => [wp.lng, wp.lat] as [number, number]);
      setRouteGeometry(directRoute);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [waypoints]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    let isMounted = true;

    getUserLocation().then((center) => {
      if (!isMounted || !mapContainer.current) return;

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            "carto-voyager": {
              type: "raster",
              tiles: [TILE_LAYER.url],
              tileSize: 256,
              attribution: TILE_LAYER.attribution,
            },
          },
          layers: [{ id: "base", type: "raster", source: "carto-voyager", minzoom: 0 }],
        },
        center,
        zoom: 12,
      });

      map.current.on("load", () => {
        map.current?.addControl(new maplibregl.NavigationControl(), "top-right");
        map.current?.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
      });

      // Use ref to get current waypoints
        map.current.on("click", (e) => {
          const currentWaypoints = waypointsRef.current;
          const newWaypoint: Waypoint = {
            id: `wp-${Date.now()}`,
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            label: `Punto ${currentWaypoints.length + 1}`,
          };
          onWaypointsChangeRef.current([...currentWaypoints, newWaypoint]);
        });
      });

    return () => {
      isMounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers and route when waypoints change
  useEffect(() => {
    if (!map.current) return;

    // Clear markers
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    // Add markers for each waypoint
    waypoints.forEach((wp, index) => {
      const el = document.createElement("div");
      el.className = "flex items-center justify-center";

      if (index === 0) {
        el.innerHTML = `<div class="w-6 h-6 rounded-full bg-emerald-500 border-3 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">I</div>`;
      } else if (index === waypoints.length - 1) {
        el.innerHTML = `<div class="w-6 h-6 rounded-full bg-rose-500 border-3 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">F</div>`;
      } else {
        el.innerHTML = `<div class="w-5 h-5 rounded-full bg-brand-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">${index + 1}</div>`;
      }

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map.current!);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        const updated = [...waypoints];
        updated[index] = { ...wp, lng: lngLat.lng, lat: lngLat.lat };
        onWaypointsChangeRef.current(updated);
      });

      markers.current.push(marker);
    });

    // Fetch route when waypoints change
    if (waypoints.length >= 2) {
      fetchRoute();
    } else {
      setRouteGeometry([]);
    }
  }, [waypoints, fetchRoute]);

  // Draw route on map
  useEffect(() => {
    if (!map.current || routeGeometry.length === 0) return;

    const sourceId = "segment-route";

    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: routeGeometry },
      });
    } else {
      map.current.addSource(sourceId, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routeGeometry } },
      });

      map.current.addLayer({
        id: "segment-route-outline",
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.5 },
      });

      map.current.addLayer({
        id: "segment-route-line",
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#0d9488", "line-width": 5, "line-opacity": 0.8 },
      });
    }
  }, [routeGeometry]);

  const removeWaypoint = (id: string) => {
    onWaypointsChange(waypoints.filter((wp) => wp.id !== id));
  };

  const clearAll = () => {
    onWaypointsChange([]);
    setRouteGeometry([]);
  };

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-[300px] w-full rounded-xl sm:h-[420px]" style={{ cursor: "crosshair" }} />

      {waypoints.length === 0 && (
          <div className="absolute left-1/2 top-3 z-10 w-[calc(100%-1.5rem)] max-w-xs -translate-x-1/2 rounded-lg bg-white/95 px-3 py-2 text-center text-xs font-medium text-slate-700 shadow-lg sm:top-4 sm:text-sm">
            Haz clic en el mapa para agregar puntos
          </div>
        )}

      {isLoadingRoute && (
          <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-slate-600 shadow sm:bottom-4">
            Calculando ruta...
          </div>
        )}

      {waypoints.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {waypoints.map((wp, index) => (
            <span
              key={wp.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                index === 0 ? "bg-emerald-100 text-emerald-700" : index === waypoints.length - 1 ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700"
              }`}
            >
              {index === 0 ? "Inicio" : index === waypoints.length - 1 ? "Fin" : `P${index + 1}`}
                <button
                  type="button"
                  onClick={() => removeWaypoint(wp.id)}
                  className="focus-ring ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[13px] leading-none hover:text-rose-500"
                  aria-label={`Quitar ${wp.label}`}
                >
                  ×
                </button>
             </span>
           ))}
             <button
               type="button"
               onClick={clearAll}
               className="focus-ring inline-flex min-h-11 items-center rounded-md px-2 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-700"
             >
              Limpiar
            </button>
         </div>
      )}
    </div>
  );
}

// Calculate distance in meters
function calculateDistance(geometry: [number, number][]): number {
  let distance = 0;
  for (let i = 1; i < geometry.length; i++) {
    const [lon1, lat1] = geometry[i - 1];
    const [lon2, lat2] = geometry[i];
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance += R * c;
  }
  return distance;
}

export function SegmentCreateForm() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [state, formAction] = useActionState(createSegmentAction, null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [formKey, setFormKey] = useState(0);

  // Update route geometry when waypoints change - call our API which uses OSRM server-side
  useEffect(() => {
    async function fetchRouteFromApi() {
      if (waypoints.length < 2) {
        setRouteGeometry([]);
        return;
      }

      try {
        const response = await fetch("/api/osrm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waypoints }),
        });

        const data = await response.json();

        if (data.route && data.route.length > 0) {
          setRouteGeometry(data.route);
          console.log("[SegmentCreateForm] Route geometry set:", data.route.length, "points");
        } else {
          // Fallback: use waypoints directly
          const directRoute = waypoints.map(wp => [wp.lng, wp.lat] as [number, number]);
          setRouteGeometry(directRoute);
        }
      } catch (error) {
        console.error("[SegmentCreateForm] Route fetch error:", error);
        // Fallback: use waypoints directly
        const directRoute = waypoints.map(wp => [wp.lng, wp.lat] as [number, number]);
        setRouteGeometry(directRoute);
      }
    }

    fetchRouteFromApi();
  }, [waypoints]);

  const distance = routeGeometry.length > 0 ? calculateDistance(routeGeometry) : 0;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("waypoints", JSON.stringify(waypoints));
    formData.set("routeGeometry", JSON.stringify(routeGeometry));
    formData.set("distanceM", distance.toString());
    startTransition(() => {
      formAction(formData);
    });
  };

  if (state && state.success && state.segmentId) {
    return (
      <Card className="max-w-3xl p-5 text-center sm:p-6">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-slate-900">Segmento creado</h2>
        <p className="mt-2 text-slate-600">Tu segmento <span className="font-semibold">{name}</span> fue guardado correctamente.</p>
        <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => (window.location.href = "/segments")}>Ver segmentos</Button>
          <Button variant="secondary" onClick={() => { setName(""); setDescription(""); setWaypoints([]); setRouteGeometry([]); setFormKey((k) => k + 1); }}>
            Crear otro
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div key={formKey} className="space-y-6">
      <Card className="p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900 mb-3">Dibujar segmento en el mapa</h2>
        <SegmentCreatorMap waypoints={waypoints} onWaypointsChange={setWaypoints} />
        <p className="mt-2 text-xs text-slate-500">
          Haz clic para agregar puntos. El primero es el inicio, el último es el fin. Arrastra los puntos para ajustar.
        </p>
      </Card>

      {distance > 0 && (
        <Card className="border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-emerald-800">Distancia calculada</p>
              <p className="text-xl font-bold text-emerald-700 sm:text-2xl">{(distance / 1000).toFixed(2)} km</p>
            </div>
            <div className="text-right text-sm text-emerald-600">
              {waypoints.length} punto{waypoints.length !== 1 ? "s" : ""}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del segmento</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: Col de la Niebla" name="name" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción (opcional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Una subida corta y técnica..." name="description" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Visibilidad</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              name="visibility"
              className="focus-ring min-h-11 w-full rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
            >
              <option value="public">Público - Visible para todos</option>
              <option value="club">Club - Solo miembros</option>
              <option value="private">Privado - Solo vos</option>
            </select>
          </div>

          {state && state.error && <p className="text-sm font-medium text-rose-600">{state.error}</p>}

          <SubmitButton disabled={waypoints.length < 2 || !name.trim()} />
        </form>
      </Card>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full">
      {pending ? "Guardando..." : "Crear segmento"}
    </Button>
  );
}
