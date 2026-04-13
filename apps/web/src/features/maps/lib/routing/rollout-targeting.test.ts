import assert from "node:assert/strict";
import test from "node:test";

import {
  hashToBucket,
  isCanaryEnabled,
  parseAllowlist,
  parsePercent
} from "./rollout-targeting";

test("parseAllowlist trims empty values", () => {
  const allowlist = parseAllowlist(" rider-1, rider-2 ,, rider-1 ");

  assert.deepEqual(Array.from(allowlist), ["rider-1", "rider-2"]);
});

test("parsePercent returns undefined for invalid values", () => {
  assert.equal(parsePercent(undefined), undefined);
  assert.equal(parsePercent("abc"), undefined);
  assert.equal(parsePercent(-1), undefined);
  assert.equal(parsePercent(101), undefined);
  assert.equal(parsePercent("30"), 30);
});

test("hashToBucket is deterministic and salt-aware", () => {
  const first = hashToBucket("rider-42", "salt-a");
  const second = hashToBucket("rider-42", "salt-a");
  const third = hashToBucket("rider-42", "salt-b");

  assert.equal(first, second);
  assert.notEqual(first, third);
  assert.ok(first >= 0 && first < 100);
});

test("isCanaryEnabled keeps legacy behavior when no canary config", () => {
  assert.equal(
    isCanaryEnabled({
      baseEnabled: true,
      allowlist: new Set(),
      percent: undefined,
      key: undefined
    }),
    true
  );
});

test("isCanaryEnabled fails closed without rollout key when canary exists", () => {
  assert.equal(
    isCanaryEnabled({
      baseEnabled: true,
      allowlist: new Set(["rider-1"]),
      percent: 10,
      key: undefined
    }),
    false
  );
});

test("isCanaryEnabled gives allowlist priority over percentage", () => {
  assert.equal(
    isCanaryEnabled({
      baseEnabled: true,
      allowlist: new Set(["vip-rider"]),
      percent: 0,
      key: "vip-rider",
      salt: "routing"
    }),
    true
  );
});

test("isCanaryEnabled respects base feature flag", () => {
  assert.equal(
    isCanaryEnabled({
      baseEnabled: false,
      allowlist: new Set(["vip-rider"]),
      percent: 100,
      key: "vip-rider"
    }),
    false
  );
});
