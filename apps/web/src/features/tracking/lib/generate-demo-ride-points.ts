import { demoRideRoute } from "./demo-ride-route";
import { haversineMeters } from "./geo-math";
import type { GpsFix } from "./tracking-types";

const MIN_ACCURACY_M = 5;
const MAX_ACCURACY_M = 25;

export function generateDemoRidePoints(startTimestamp = Date.now()): GpsFix[] {
  return demoRideRoute.map((point, index, route) => {
    const previous = route[index - 1];
    const distanceM = previous ? haversineMeters(previous, point) : 0;
    const baseSpeedKmh = getDemoSpeedKmh(index, route.length, distanceM);
    const variedSpeedKmh = baseSpeedKmh === 0 ? 0 : clamp(baseSpeedKmh + Math.sin(index * 0.7) * 2.4, 0, 60);

    return {
      lat: point.lat,
      lng: point.lng,
      timestamp: startTimestamp + index * 1000,
      accuracyM: MIN_ACCURACY_M + ((index * 7) % (MAX_ACCURACY_M - MIN_ACCURACY_M + 1)),
      speedMs: Number((variedSpeedKmh / 3.6).toFixed(2)),
      altitudeM: point.altitudeM ?? null,
    };
  });
}

function getDemoSpeedKmh(index: number, total: number, distanceM: number): number {
  if (index === 0 || index >= total - 2) {
    return 0;
  }

  if (index < 6) {
    return 12 + index * 3.5;
  }

  if (index > total - 8) {
    return Math.max(0, (total - index - 2) * 4);
  }

  if (distanceM >= 18) {
    return 43 + (index % 6) * 2.5;
  }

  return 22 + (index % 5) * 2.4;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
