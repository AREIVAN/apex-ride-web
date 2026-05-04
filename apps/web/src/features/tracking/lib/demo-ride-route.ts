import type { GeoPoint } from "./tracking-types";

export interface DemoRideRoutePoint extends GeoPoint {
  altitudeM?: number;
}

const DEMO_WAYPOINTS: DemoRideRoutePoint[] = [
  { lat: 19.21306, lng: -98.92968, altitudeM: 2252 },
  { lat: 19.21336, lng: -98.92796, altitudeM: 2254 },
  { lat: 19.21292, lng: -98.92616, altitudeM: 2256 },
  { lat: 19.21182, lng: -98.92483, altitudeM: 2258 },
  { lat: 19.21038, lng: -98.92396, altitudeM: 2261 },
  { lat: 19.20872, lng: -98.92372, altitudeM: 2262 },
  { lat: 19.2072, lng: -98.9242, altitudeM: 2260 },
  { lat: 19.20618, lng: -98.92542, altitudeM: 2258 },
  { lat: 19.20594, lng: -98.9271, altitudeM: 2256 },
  { lat: 19.20672, lng: -98.92874, altitudeM: 2255 },
  { lat: 19.20818, lng: -98.92972, altitudeM: 2253 },
  { lat: 19.21006, lng: -98.93008, altitudeM: 2252 },
  { lat: 19.21176, lng: -98.92976, altitudeM: 2252 },
  { lat: 19.21306, lng: -98.92968, altitudeM: 2252 },
];

export const demoRideRoute: DemoRideRoutePoint[] = buildDemoRoute(DEMO_WAYPOINTS, 112);

function buildDemoRoute(waypoints: DemoRideRoutePoint[], totalPoints: number): DemoRideRoutePoint[] {
  const segmentCount = waypoints.length - 1;
  const pointsPerSegment = Math.floor((totalPoints - 1) / segmentCount);
  const remainder = (totalPoints - 1) % segmentCount;
  const route: DemoRideRoutePoint[] = [];

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const from = waypoints[segmentIndex];
    const to = waypoints[segmentIndex + 1];
    const steps = pointsPerSegment + (segmentIndex < remainder ? 1 : 0);

    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      route.push({
        lat: interpolate(from.lat, to.lat, t),
        lng: interpolate(from.lng, to.lng, t),
        altitudeM:
          typeof from.altitudeM === "number" && typeof to.altitudeM === "number"
            ? Math.round(interpolate(from.altitudeM, to.altitudeM, t))
            : undefined,
      });
    }
  }

  route.push(waypoints[waypoints.length - 1]);
  return route;
}

function interpolate(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
