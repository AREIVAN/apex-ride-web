import { z } from "zod";

export const geoPointSchema = z.object({
  lat: z.number().finite().gte(-90).lte(90),
  lng: z.number().finite().gte(-180).lte(180)
});

export type GeoPoint = z.infer<typeof geoPointSchema>;

export const gpsFixSchema = geoPointSchema.extend({
  timestamp: z.number().int().nonnegative(),
  accuracyM: z.number().finite().nonnegative().nullable(),
  speedMs: z.number().finite().nonnegative().nullable(),
  altitudeM: z.number().finite().nullable().optional()
});

export type GpsFix = z.infer<typeof gpsFixSchema>;

export const trackPointSchema = geoPointSchema.extend({
  timestamp: z.number().int().nonnegative(),
  altitudeM: z.number().finite().nullable().optional(),
  speedMs: z.number().finite().nonnegative().nullable().optional(),
  accuracyM: z.number().finite().nonnegative().nullable().optional()
});

export type TrackPoint = z.infer<typeof trackPointSchema>;

export const segmentDefinitionSchema = z.object({
  id: z.string().min(1),
  start: geoPointSchema,
  end: geoPointSchema,
  route: z.array(geoPointSchema).min(2),
  radiusM: z.number().finite().positive().optional()
});

export type SegmentDefinition = z.infer<typeof segmentDefinitionSchema>;

export const gpsFilterConfigSchema = z.object({
  maxAccuracyM: z.number().finite().positive(),
  warmupDurationMs: z.number().finite().nonnegative(),
  warmupAccuracyM: z.number().finite().positive(),
  warmupGoodFixes: z.number().int().nonnegative(),
  stopSpeedKmh: z.number().finite().nonnegative(),
  stopStreak: z.number().int().positive(),
  maxJumpM: z.number().finite().positive(),
  maxJumpDeltaS: z.number().finite().positive(),
  smoothingAlpha: z.number().finite().gte(0).lte(1),
  maxSegmentDistanceM: z.number().finite().positive(),
  minMoveFloorM: z.number().finite().positive()
});

export type GpsFilterConfig = z.infer<typeof gpsFilterConfigSchema>;

export const attemptDetectorConfigSchema = z.object({
  minOnRouteRatio: z.number().finite().gte(0).lte(1),
  minGateRadiusM: z.number().finite().positive(),
  minRouteToleranceM: z.number().finite().positive(),
  maxRouteToleranceM: z.number().finite().positive(),
  routeToleranceMultiplier: z.number().finite().positive(),
  minElapsedSec: z.number().int().positive()
});

export type AttemptDetectorConfig = z.infer<typeof attemptDetectorConfigSchema>;

export const rideMetricsConfigSchema = z.object({
  maxJumpM: z.number().finite().positive(),
  maxJumpDeltaS: z.number().finite().positive(),
  minMoveM: z.number().finite().nonnegative(),
  movingSpeedKmhThreshold: z.number().finite().nonnegative(),
  elevationNoiseFloorM: z.number().finite().nonnegative()
});

export type RideMetricsConfig = z.infer<typeof rideMetricsConfigSchema>;
