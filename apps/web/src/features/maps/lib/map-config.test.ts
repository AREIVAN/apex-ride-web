import assert from "node:assert/strict";
import test from "node:test";

import { MAP_FALLBACK_STYLE, MAP_STYLES, resolveMapStyle } from "./map-config";

test("resolveMapStyle returns Mapbox style when token exists", () => {
  const style = resolveMapStyle("token-value");
  assert.equal(style, MAP_STYLES.streets);
});

test("resolveMapStyle returns raster fallback without token", () => {
  const style = resolveMapStyle("");

  assert.deepEqual(style, MAP_FALLBACK_STYLE);

  if (typeof style === "string") {
    throw new Error("Expected raster style object when token is missing");
  }

  assert.equal(style.version, 8);
  assert.equal(style.sources.osm.type, "raster");
  assert.equal(style.sources.osm.tiles[0], "https://tile.openstreetmap.org/{z}/{x}/{y}.png");
});
