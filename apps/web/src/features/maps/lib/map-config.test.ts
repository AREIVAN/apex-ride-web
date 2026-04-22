import assert from "node:assert/strict";
import test from "node:test";

import {
  MAP_FALLBACK_STYLE,
  MAP_STYLES,
  getMapboxToken,
  resolveMapStyle,
} from "./map-config";

function withMapboxToken(token: string | undefined, run: () => void) {
  const previous = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN = token;

  try {
    run();
  } finally {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = previous;
  }
}

test("getMapboxToken trims valid public token", () => {
  withMapboxToken("  pk.valid-public-token  ", () => {
    assert.equal(getMapboxToken(), "pk.valid-public-token");
  });
});

test("getMapboxToken rejects placeholder token", () => {
  withMapboxToken("pk.your_mapbox_public_token", () => {
    assert.equal(getMapboxToken(), "");
  });
});

test("getMapboxToken rejects non-public token", () => {
  withMapboxToken("sk.secret-token", () => {
    assert.equal(getMapboxToken(), "");
  });
});

test("resolveMapStyle returns Mapbox style when token exists", () => {
  const style = resolveMapStyle("pk.token-value");
  assert.equal(style, MAP_STYLES.streets);
});

test("resolveMapStyle returns raster fallback for invalid token format", () => {
  const style = resolveMapStyle("sk.secret-token");
  assert.deepEqual(style, MAP_FALLBACK_STYLE);
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
