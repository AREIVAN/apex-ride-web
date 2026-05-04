import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRideTrackPoints } from "./normalize-ride-track-points";

test("normalizeRideTrackPoints parses object coordinate variants", () => {
  assert.deepEqual(normalizeRideTrackPoints({ points: [
    { lat: "-34.6037", lng: "-58.3816", capturedAt: "2026-05-04T10:00:00.000Z", speedKmh: "30" },
    { latitude: -34.59, longitude: -58.37 },
    { coords: { latitude: -34.58, longitude: -58.36 } },
    { position: { lat: -34.57, lng: -58.35 } },
  ] }), [
    { lat: -34.6037, lng: -58.3816, timestamp: "2026-05-04T10:00:00.000Z", speed: 30 },
    { lat: -34.59, lng: -58.37 },
    { lat: -34.58, lng: -58.36 },
    { lat: -34.57, lng: -58.35 },
  ]);
});

test("normalizeRideTrackPoints parses GeoJSON-ish coordinates and arrays", () => {
  assert.deepEqual(normalizeRideTrackPoints([
    { coordinates: [-58.3816, -34.6037] },
    [34.59, -118.37],
  ]), [
    { lat: -34.6037, lng: -58.3816 },
    { lat: 34.59, lng: -118.37 },
  ]);
});

test("normalizeRideTrackPoints parses WKT and EWKT points", () => {
  assert.deepEqual(normalizeRideTrackPoints([
    "POINT(-58.3816 -34.6037)",
    "SRID=4326;POINT Z (-58.3700 -34.5900 0)",
  ]), [
    { lat: -34.6037, lng: -58.3816 },
    { lat: -34.59, lng: -58.37 },
  ]);
});

test("normalizeRideTrackPoints parses EWKB hex Point values", () => {
  const point = createEwkbPointHex(-58.3816, -34.6037);

  assert.deepEqual(normalizeRideTrackPoints(point), [
    { lat: -34.6037, lng: -58.3816 },
  ]);
});

test("normalizeRideTrackPoints filters invalid values and duplicate consecutive points", () => {
  assert.deepEqual(normalizeRideTrackPoints([
    { lat: -34.6037, lng: -58.3816 },
    { lat: -34.6037, lng: -58.3816 },
    { lat: 91, lng: -58.37 },
    "not-a-point",
    { lat: -34.59, lng: -58.37 },
  ]), [
    { lat: -34.6037, lng: -58.3816 },
    { lat: -34.59, lng: -58.37 },
  ]);
});

function createEwkbPointHex(lng: number, lat: number): string {
  const buffer = new ArrayBuffer(1 + 4 + 4 + 16);
  const view = new DataView(buffer);
  let offset = 0;

  view.setUint8(offset, 1);
  offset += 1;

  view.setUint32(offset, 0x20000001, true);
  offset += 4;

  view.setUint32(offset, 4326, true);
  offset += 4;

  view.setFloat64(offset, lng, true);
  view.setFloat64(offset + 8, lat, true);

  return `\\x${Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}
