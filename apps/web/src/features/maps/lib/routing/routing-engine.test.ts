import assert from "node:assert/strict";
import test from "node:test";

import { createRoutingEngine } from "./routing-engine";

type FetchStub = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}

test("uses Mapbox Directions when available", async () => {
  const fetchStub: FetchStub = async (input) => {
    const url = String(input);
    assert.ok(url.includes("api.mapbox.com/directions"));
    return createJsonResponse({
      code: "Ok",
      routes: [
        {
          geometry: { coordinates: [[-58.38, -34.6], [-58.37, -34.59]] },
          distance: 1200,
          duration: 320
        }
      ]
    });
  };

  const engine = createRoutingEngine(
    {
      mapboxToken: "token",
      directionsEnabled: true,
      mapMatchingEnabled: false,
      timeoutMs: 1000
    },
    { fetchImpl: fetchStub as typeof fetch }
  );

  const result = await engine.getIdealRoute([
    { lng: -58.38, lat: -34.6 },
    { lng: -58.37, lat: -34.59 }
  ]);

  assert.equal(result.provider, "mapbox-directions");
  assert.equal(result.isFallback, false);
  assert.equal(result.route.length, 2);
});

test("falls back to OSRM when Mapbox Directions fails", async () => {
  let callCount = 0;
  const fetchStub: FetchStub = async (input) => {
    const url = String(input);
    callCount += 1;

    if (url.includes("api.mapbox.com/directions")) {
      return createJsonResponse({ code: "NoRoute", routes: [] }, 200);
    }

    assert.ok(url.includes("router.project-osrm.org"));
    return createJsonResponse({
      code: "Ok",
      routes: [
        {
          geometry: { coordinates: [[-58.38, -34.6], [-58.36, -34.58]] },
          distance: 1800,
          duration: 420
        }
      ]
    });
  };

  const engine = createRoutingEngine(
    {
      mapboxToken: "token",
      directionsEnabled: true,
      mapMatchingEnabled: false,
      timeoutMs: 1000
    },
    { fetchImpl: fetchStub as typeof fetch }
  );

  const result = await engine.getIdealRoute([
    { lng: -58.38, lat: -34.6 },
    { lng: -58.36, lat: -34.58 }
  ]);

  assert.equal(callCount, 2);
  assert.equal(result.provider, "osrm");
  assert.equal(result.isFallback, false);
});

test("falls back to OSRM when directions canary blocks key", async () => {
  let mapboxCalled = false;
  let osrmCalled = false;
  const fetchStub: FetchStub = async (input) => {
    const url = String(input);

    if (url.includes("api.mapbox.com/directions")) {
      mapboxCalled = true;
      return createJsonResponse({}, 500);
    }

    if (url.includes("router.project-osrm.org")) {
      osrmCalled = true;
      return createJsonResponse({
        code: "Ok",
        routes: [
          {
            geometry: { coordinates: [[-58.38, -34.6], [-58.36, -34.58]] },
            distance: 1800,
            duration: 420
          }
        ]
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const engine = createRoutingEngine(
    {
      mapboxToken: "token",
      directionsEnabled: true,
      mapMatchingEnabled: false,
      directionsCanaryPercent: 0,
      timeoutMs: 1000
    },
    { fetchImpl: fetchStub as typeof fetch }
  );

  const result = await engine.getIdealRoute(
    [
      { lng: -58.38, lat: -34.6 },
      { lng: -58.36, lat: -34.58 }
    ],
    { rolloutKey: "rider-100" }
  );

  assert.equal(mapboxCalled, false);
  assert.equal(osrmCalled, true);
  assert.equal(result.provider, "osrm");
  assert.equal(result.reason, "directions-canary-disabled");
});

test("allows Mapbox Directions when rollout key is allowlisted", async () => {
  let callCount = 0;
  const fetchStub: FetchStub = async (input) => {
    const url = String(input);
    callCount += 1;
    assert.ok(url.includes("api.mapbox.com/directions"));

    return createJsonResponse({
      code: "Ok",
      routes: [
        {
          geometry: { coordinates: [[-58.38, -34.6], [-58.37, -34.59]] },
          distance: 1200,
          duration: 320
        }
      ]
    });
  };

  const engine = createRoutingEngine(
    {
      mapboxToken: "token",
      directionsEnabled: true,
      mapMatchingEnabled: false,
      directionsCanaryAllowlist: new Set(["vip-rider"]),
      directionsCanaryPercent: 0,
      timeoutMs: 1000
    },
    { fetchImpl: fetchStub as typeof fetch }
  );

  const result = await engine.getIdealRoute(
    [
      { lng: -58.38, lat: -34.6 },
      { lng: -58.37, lat: -34.59 }
    ],
    { rolloutKey: "vip-rider" }
  );

  assert.equal(callCount, 1);
  assert.equal(result.provider, "mapbox-directions");
});

test("returns direct route when all providers fail", async () => {
  const fetchStub: FetchStub = async () => createJsonResponse({}, 500);

  const engine = createRoutingEngine(
    {
      mapboxToken: "token",
      directionsEnabled: true,
      mapMatchingEnabled: true,
      timeoutMs: 1000
    },
    { fetchImpl: fetchStub as typeof fetch }
  );

  const result = await engine.getIdealRoute([
    { lng: -58.38, lat: -34.6 },
    { lng: -58.37, lat: -34.59 }
  ]);

  assert.equal(result.provider, "direct");
  assert.equal(result.isFallback, true);
  assert.equal(result.route.length, 2);
});

test("map matching keeps original points when disabled", async () => {
  const engine = createRoutingEngine({
    mapboxToken: "",
    directionsEnabled: true,
    mapMatchingEnabled: false,
    timeoutMs: 1000
  });

  const raw = [
    { lng: -58.38, lat: -34.6, timestamp: 1000 },
    { lng: -58.37, lat: -34.59, timestamp: 2000 }
  ];

  const result = await engine.matchTrace(raw);
  assert.equal(result.provider, "none");
  assert.equal(result.isFallback, true);
  assert.deepEqual(result.points, raw);
});

test("map matching canary fail-closed when key is missing", async () => {
  const engine = createRoutingEngine({
    mapboxToken: "token",
    directionsEnabled: true,
    mapMatchingEnabled: true,
    mapMatchingCanaryPercent: 50,
    timeoutMs: 1000
  });

  const raw = [
    { lng: -58.38, lat: -34.6, timestamp: 1000 },
    { lng: -58.37, lat: -34.59, timestamp: 2000 }
  ];

  const result = await engine.matchTrace(raw);
  assert.equal(result.provider, "none");
  assert.equal(result.reason, "map-matching-canary-disabled");
  assert.deepEqual(result.points, raw);
});

test("map matching snaps coordinates and preserves metadata", async () => {
  const fetchStub: FetchStub = async (input) => {
    const url = String(input);
    assert.ok(url.includes("api.mapbox.com/matching"));

    return createJsonResponse({
      code: "Ok",
      tracepoints: [
        { location: [-58.3801, -34.6001] },
        { location: [-58.3702, -34.5902] }
      ]
    });
  };

  const engine = createRoutingEngine(
    {
      mapboxToken: "token",
      directionsEnabled: true,
      mapMatchingEnabled: true,
      timeoutMs: 1000
    },
    { fetchImpl: fetchStub as typeof fetch }
  );

  const result = await engine.matchTrace([
    { lng: -58.38, lat: -34.6, timestamp: 1000, speedMs: 6 },
    { lng: -58.37, lat: -34.59, timestamp: 2000, speedMs: 8 }
  ]);

  assert.equal(result.provider, "mapbox-map-matching");
  assert.equal(result.isFallback, false);
  assert.equal(result.points[0].speedMs, 6);
  assert.deepEqual([result.points[0].lng, result.points[0].lat], [-58.3801, -34.6001]);
});
