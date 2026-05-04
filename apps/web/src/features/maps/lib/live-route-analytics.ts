import type { Feature, FeatureCollection, LineString } from "geojson";

import { buildSpeedColoredSegments, type SpeedBucket } from "@/features/rides/lib/speed-colored-segments";

const EARTH_RADIUS_M = 6_371_000;

export type TrackSpeedSample = {
  lng: number;
  lat: number;
  speedKmh: number | null;
};

export type SegmentRelation = {
  distanceM: number;
  progressPct: number;
  projectedPoint: [number, number];
  projectedSegmentIndex: number;
};

export function buildSpeedSegmentFeatureCollection(samples: TrackSpeedSample[]): FeatureCollection<
  LineString,
  { speedKmh: number | null; speedBucket: SpeedBucket }
> {
  const features: Feature<LineString, { speedKmh: number | null; speedBucket: SpeedBucket }>[] = buildSpeedColoredSegments(samples).map((segment) => ({
    type: "Feature",
    properties: {
      speedKmh: segment.speedKmh,
      speedBucket: segment.bucket,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [segment.from.lng, segment.from.lat],
        [segment.to.lng, segment.to.lat],
      ],
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

export function computeSegmentRelation(
  currentPosition: [number, number],
  segmentCoordinates: [number, number][]
): SegmentRelation | null {
  if (segmentCoordinates.length < 2) return null;

  const lengths = getPolylineSegmentLengths(segmentCoordinates);
  const totalLength = lengths.reduce((acc, value) => acc + value, 0);
  if (totalLength <= 0) return null;

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestProjection: [number, number] = segmentCoordinates[0];
  let bestSegmentIndex = 0;
  let bestT = 0;

  for (let index = 0; index < segmentCoordinates.length - 1; index += 1) {
    const from = segmentCoordinates[index];
    const to = segmentCoordinates[index + 1];
    const projection = projectPointToSegment(currentPosition, from, to);

    if (projection.distanceM < bestDistance) {
      bestDistance = projection.distanceM;
      bestProjection = projection.projectedPoint;
      bestSegmentIndex = index;
      bestT = projection.t;
    }
  }

  let traveled = 0;
  for (let index = 0; index < bestSegmentIndex; index += 1) {
    traveled += lengths[index] ?? 0;
  }
  traveled += (lengths[bestSegmentIndex] ?? 0) * bestT;

  return {
    distanceM: bestDistance,
    progressPct: clamp((traveled / totalLength) * 100, 0, 100),
    projectedPoint: bestProjection,
    projectedSegmentIndex: bestSegmentIndex,
  };
}

export function buildSegmentProgressCoordinates(
  segmentCoordinates: [number, number][],
  relation: SegmentRelation | null
): [number, number][] {
  if (!relation || segmentCoordinates.length < 2) return [];

  const progressCoordinates: [number, number][] = [];
  for (let index = 0; index <= relation.projectedSegmentIndex; index += 1) {
    progressCoordinates.push(segmentCoordinates[index]);
  }

  const last = progressCoordinates[progressCoordinates.length - 1];
  if (!last || last[0] !== relation.projectedPoint[0] || last[1] !== relation.projectedPoint[1]) {
    progressCoordinates.push(relation.projectedPoint);
  }

  return progressCoordinates;
}

function projectPointToSegment(
  point: [number, number],
  from: [number, number],
  to: [number, number]
): { distanceM: number; projectedPoint: [number, number]; t: number } {
  const referenceLat = ((from[1] + to[1] + point[1]) / 3) * (Math.PI / 180);

  const p = lngLatToMeters(point, referenceLat);
  const a = lngLatToMeters(from, referenceLat);
  const b = lngLatToMeters(to, referenceLat);

  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;

  const tRaw = ab2 === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / ab2;
  const t = clamp(tRaw, 0, 1);

  const projectedMeters = {
    x: a.x + abx * t,
    y: a.y + aby * t,
  };

  return {
    distanceM: Math.hypot(p.x - projectedMeters.x, p.y - projectedMeters.y),
    projectedPoint: metersToLngLat(projectedMeters, referenceLat),
    t,
  };
}

function getPolylineSegmentLengths(coordinates: [number, number][]): number[] {
  const lengths: number[] = [];

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    lengths.push(haversineMeters(coordinates[index], coordinates[index + 1]));
  }

  return lengths;
}

function haversineMeters(from: [number, number], to: [number, number]): number {
  const fromLat = toRadians(from[1]);
  const toLat = toRadians(to[1]);
  const dLat = toLat - fromLat;
  const dLng = toRadians(to[0] - from[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function lngLatToMeters(coord: [number, number], referenceLat: number): { x: number; y: number } {
  const lngRad = toRadians(coord[0]);
  const latRad = toRadians(coord[1]);

  return {
    x: EARTH_RADIUS_M * lngRad * Math.cos(referenceLat),
    y: EARTH_RADIUS_M * latRad,
  };
}

function metersToLngLat(
  point: { x: number; y: number },
  referenceLat: number
): [number, number] {
  const lng = toDegrees(point.x / (EARTH_RADIUS_M * Math.cos(referenceLat)));
  const lat = toDegrees(point.y / EARTH_RADIUS_M);
  return [lng, lat];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
