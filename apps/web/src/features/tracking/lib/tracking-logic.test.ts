import assert from "node:assert/strict";
import test from "node:test";

import { computeRideMetrics } from "./ride-metrics";
import { createGpsFilterState, defaultGpsFilterConfig, ingestGpsFix } from "./gps-filters";
import { detectSegmentAttempts } from "./segment-attempt-detector";

test("gps filter ignores teleports and keeps warmup lock", () => {
  const base = 1_700_000_000_000;
  let state = createGpsFilterState(base);

  const first = ingestGpsFix(state, {
    lat: -34.6,
    lng: -58.38,
    timestamp: base,
    accuracyM: 12,
    speedMs: null
  });

  state = first.state;

  const second = ingestGpsFix(state, {
    lat: -34.6,
    lng: -58.3798,
    timestamp: base + 4500,
    accuracyM: 8,
    speedMs: 7
  });

  state = second.state;

  const teleport = ingestGpsFix(state, {
    lat: -34.56,
    lng: -58.31,
    timestamp: base + 5000,
    accuracyM: 5,
    speedMs: null
  });

  assert.equal(first.metrics.warmupLocked, true);
  assert.equal(second.metrics.warmupLocked, false);
  assert.equal(teleport.rejectedByTeleport, true);
  assert.equal(Math.round(teleport.metrics.distanceM), Math.round(second.metrics.distanceM));
});

test("computeRideMetrics derives ascent and descent", () => {
  const metrics = computeRideMetrics([
    { lat: -34.6, lng: -58.38, timestamp: 0, altitudeM: 10 },
    { lat: -34.6003, lng: -58.3797, timestamp: 2000, altitudeM: 16 },
    { lat: -34.6006, lng: -58.3794, timestamp: 4000, altitudeM: 12 }
  ]);

  assert.equal(Math.round(metrics.ascentM), 6);
  assert.equal(Math.round(metrics.descentM), 4);
  assert.ok(metrics.distanceM > 0);
});

test("gps filter releases warmup after extended timeout", () => {
  const base = 1_700_000_000_000;
  const config = {
    ...defaultGpsFilterConfig,
    warmupDurationMs: 2_000,
    warmupGoodFixes: 2,
    warmupAccuracyM: 10,
    maxAccuracyM: 40
  };

  let state = createGpsFilterState(base);

  const first = ingestGpsFix(state, {
    lat: -34.6,
    lng: -58.38,
    timestamp: base,
    accuracyM: 30,
    speedMs: null
  }, config);

  state = first.state;

  const second = ingestGpsFix(state, {
    lat: -34.6,
    lng: -58.3798,
    timestamp: base + 5_000,
    accuracyM: 30,
    speedMs: null
  }, config);

  state = second.state;

  const afterTimeout = ingestGpsFix(state, {
    lat: -34.6,
    lng: -58.3796,
    timestamp: base + 15_500,
    accuracyM: 30,
    speedMs: null
  }, config);

  assert.equal(first.metrics.warmupLocked, true);
  assert.equal(second.metrics.warmupLocked, true);
  assert.equal(afterTimeout.metrics.warmupLocked, false);
  assert.ok(afterTimeout.metrics.pointsAccepted > 0);
});

test("gps filter accumulates moving time from speed even with tiny steps", () => {
  const base = 1_700_000_100_000;
  const config = {
    ...defaultGpsFilterConfig,
    warmupDurationMs: 0,
    warmupGoodFixes: 0,
    minMoveFloorM: 6
  };

  let state = createGpsFilterState(base);

  const first = ingestGpsFix(state, {
    lat: -34.6,
    lng: -58.38,
    timestamp: base,
    accuracyM: 5,
    speedMs: 3
  }, config);

  state = first.state;

  const second = ingestGpsFix(state, {
    lat: -34.599996,
    lng: -58.379996,
    timestamp: base + 1_000,
    accuracyM: 5,
    speedMs: 3
  }, config);

  assert.equal(Math.round(second.metrics.distanceM), 0);
  assert.equal(second.metrics.movingTimeSec, 1);
});

test("detectSegmentAttempts validates route adherence", () => {
  const points = [
    { lat: -34.6037, lng: -58.3816, timestamp: 0 },
    { lat: -34.5998, lng: -58.3867, timestamp: 10_000 },
    { lat: -34.5959, lng: -58.392, timestamp: 20_000 },
    { lat: -34.5921, lng: -58.4005, timestamp: 30_000 },
    { lat: -34.5883, lng: -58.4102, timestamp: 40_000 }
  ];

  const attempts = detectSegmentAttempts(points, [
    {
      id: "seg-1",
      start: { lat: -34.6037, lng: -58.3816 },
      end: { lat: -34.5883, lng: -58.4102 },
      route: [
        { lat: -34.6037, lng: -58.3816 },
        { lat: -34.596, lng: -58.392 },
        { lat: -34.5883, lng: -58.4102 }
      ],
      radiusM: 35
    }
  ]);

  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].segmentId, "seg-1");
  assert.ok(attempts[0].onRouteRatio >= 0.6);
});
