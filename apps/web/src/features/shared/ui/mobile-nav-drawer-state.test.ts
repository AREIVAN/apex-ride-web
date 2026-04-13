import assert from "node:assert/strict";
import test from "node:test";

import { closeMobileNavDrawer, isMobileNavViewport, toggleMobileNavDrawer } from "./mobile-nav-drawer-state";

test("opens on trigger click or tap", () => {
  assert.equal(toggleMobileNavDrawer(false), true);
});

test("closes correctly", () => {
  assert.equal(closeMobileNavDrawer(), false);
  assert.equal(toggleMobileNavDrawer(true), false);
});

test("can open and close repeatedly", () => {
  let open = false;

  open = toggleMobileNavDrawer(open);
  assert.equal(open, true);

  open = toggleMobileNavDrawer(open);
  assert.equal(open, false);

  open = toggleMobileNavDrawer(open);
  assert.equal(open, true);

  open = closeMobileNavDrawer();
  assert.equal(open, false);
});

test("small viewport breakpoint matches responsive menu behavior", () => {
  assert.equal(isMobileNavViewport(375), true);
  assert.equal(isMobileNavViewport(1023), true);
  assert.equal(isMobileNavViewport(1024), false);
});
