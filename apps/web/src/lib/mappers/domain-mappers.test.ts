import assert from "node:assert/strict";
import test from "node:test";

import { mapSegmentRow, parseLineCoordinates } from "./domain-mappers";

test("parseLineCoordinates parses WKT and EWKT line strings", () => {
  const wkt = "LINESTRING(-58.3816 -34.6037, -58.3700 -34.5900)";
  const ewkt = "SRID=4326;LINESTRING Z (-58.3816 -34.6037 0, -58.3700 -34.5900 0)";

  assert.deepEqual(parseLineCoordinates(wkt), [
    [-58.3816, -34.6037],
    [-58.37, -34.59],
  ]);
  assert.deepEqual(parseLineCoordinates(ewkt), [
    [-58.3816, -34.6037],
    [-58.37, -34.59],
  ]);
});

test("parseLineCoordinates parses GeoJSON object and JSON string", () => {
  const geojson = {
    type: "LineString",
    coordinates: [
      [-58.3816, -34.6037],
      [-58.37, -34.59],
    ],
  };

  const asString = JSON.stringify(geojson);

  assert.deepEqual(parseLineCoordinates(geojson), [
    [-58.3816, -34.6037],
    [-58.37, -34.59],
  ]);
  assert.deepEqual(parseLineCoordinates(asString), [
    [-58.3816, -34.6037],
    [-58.37, -34.59],
  ]);
});

test("parseLineCoordinates parses EWKB hex LineString values", () => {
  const ewkbHex = createEwkbLineStringHex([
    [-58.3816, -34.6037],
    [-58.37, -34.59],
  ]);

  assert.deepEqual(parseLineCoordinates(ewkbHex), [
    [-58.3816, -34.6037],
    [-58.37, -34.59],
  ]);
});

test("mapSegmentRow uses parsed pathCoordinates from geom", () => {
  const row = {
    id: "segment-1",
    creator_id: "creator-1",
    name: "Test Segment",
    description: "desc",
    distance_m: 1200,
    elevation_gain_m: 50,
    avg_gradient_pct: 4.2,
    visibility: "public",
    start_lat: -34.6037,
    start_lng: -58.3816,
    end_lat: -34.59,
    end_lng: -58.37,
    geom: "LINESTRING(-58.3816 -34.6037, -58.3700 -34.5900)",
    created_at: "2026-04-13T00:00:00.000Z",
  };

  const segment = mapSegmentRow(row as never);

  assert.deepEqual(segment.pathCoordinates, [
    [-58.3816, -34.6037],
    [-58.37, -34.59],
  ]);
});

function createEwkbLineStringHex(points: [number, number][]): string {
  const buffer = new ArrayBuffer(1 + 4 + 4 + 4 + points.length * 16);
  const view = new DataView(buffer);
  let offset = 0;

  view.setUint8(offset, 1);
  offset += 1;

  view.setUint32(offset, 0x20000002, true);
  offset += 4;

  view.setUint32(offset, 4326, true);
  offset += 4;

  view.setUint32(offset, points.length, true);
  offset += 4;

  for (const [lng, lat] of points) {
    view.setFloat64(offset, lng, true);
    view.setFloat64(offset + 8, lat, true);
    offset += 16;
  }

  const bytes = new Uint8Array(buffer);
  const hex = Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return `\\x${hex}`;
}
