import type { GeoPoint } from "./tracking-types";

export function haversineMeters(from: GeoPoint, to: GeoPoint): number {
  const radius = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * radius * Math.asin(Math.sqrt(a));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function pointToSegmentDistanceMeters(point: GeoPoint, from: GeoPoint, to: GeoPoint): number {
  const radius = 6371000;
  const latitude = (point.lat * Math.PI) / 180;
  const x = (lng: number) => radius * ((lng * Math.PI) / 180) * Math.cos(latitude);
  const y = (lat: number) => radius * ((lat * Math.PI) / 180);

  const px = x(point.lng);
  const py = y(point.lat);
  const ax = x(from.lng);
  const ay = y(from.lat);
  const bx = x(to.lng);
  const by = y(to.lat);

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const cx = ax + t * abx;
  const cy = ay + t * aby;

  return Math.hypot(px - cx, py - cy);
}

export function distancePointToPolylineMeters(point: GeoPoint, polyline: GeoPoint[]): number {
  let best = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const distance = pointToSegmentDistanceMeters(point, polyline[index], polyline[index + 1]);
    if (distance < best) {
      best = distance;
    }
  }

  return best;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
