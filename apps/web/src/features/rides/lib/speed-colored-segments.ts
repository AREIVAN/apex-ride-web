export type SpeedBucket = "low" | "medium" | "high" | "unknown";

export type SpeedSegmentPoint = {
  lng: number;
  lat: number;
  speedKmh?: number | null;
};

export type SpeedColoredSegment = {
  from: SpeedSegmentPoint;
  to: SpeedSegmentPoint;
  speedKmh: number | null;
  bucket: SpeedBucket;
  color: string;
};

export const SPEED_SEGMENT_COLORS: Record<SpeedBucket, string> = {
  low: "#0ea5e9",
  medium: "#14b8a6",
  high: "#f97316",
  unknown: "#94a3b8",
};

export function buildSpeedColoredSegments(points: SpeedSegmentPoint[]): SpeedColoredSegment[] {
  const validPoints = points.filter(isValidPoint);
  const segments: SpeedColoredSegment[] = [];

  for (let index = 0; index < validPoints.length - 1; index += 1) {
    const from = validPoints[index];
    const to = validPoints[index + 1];
    const speedKmh = resolveSegmentSpeed(from.speedKmh, to.speedKmh);
    const bucket = classifySpeedBucket(speedKmh);

    segments.push({
      from,
      to,
      speedKmh,
      bucket,
      color: SPEED_SEGMENT_COLORS[bucket],
    });
  }

  return segments;
}

export function classifySpeedBucket(speedKmh: number | null): SpeedBucket {
  if (speedKmh === null || !Number.isFinite(speedKmh) || speedKmh < 0) return "unknown";
  if (speedKmh < 30) return "low";
  if (speedKmh <= 55) return "medium";
  return "high";
}

function resolveSegmentSpeed(from: number | null | undefined, to: number | null | undefined): number | null {
  const hasFrom = typeof from === "number" && Number.isFinite(from) && from >= 0;
  const hasTo = typeof to === "number" && Number.isFinite(to) && to >= 0;

  if (hasFrom && hasTo) return ((from as number) + (to as number)) / 2;
  if (hasTo) return to as number;
  if (hasFrom) return from as number;
  return null;
}

function isValidPoint(point: SpeedSegmentPoint): boolean {
  return (
    Number.isFinite(point.lng) &&
    Number.isFinite(point.lat) &&
    point.lng >= -180 &&
    point.lng <= 180 &&
    point.lat >= -90 &&
    point.lat <= 90
  );
}
