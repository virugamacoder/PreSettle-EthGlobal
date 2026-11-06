import { test } from "node:test";
import assert from "node:assert/strict";
import { needsExpiry } from "../src/contracts/otc.js";

const NOW = 1_800_000_000;
const order = (over = {}) => ({
  cancelled: false,
  deadline: BigInt(NOW - 1),
  offerAmount: 100n,
  filledOffer: 30n,
  ...over,
});

test("past deadline with unfilled amount needs expiry", () => {
  assert.equal(needsExpiry(order(), NOW), true);
});

test("deadline exactly now counts as passed", () => {
  assert.equal(needsExpiry(order({ deadline: BigInt(NOW) }), NOW), true);
});

test("not yet past deadline", () => {
  assert.equal(needsExpiry(order({ deadline: BigInt(NOW + 60) }), NOW), false);
});

test("fully filled order has nothing to refund", () => {
  assert.equal(needsExpiry(order({ filledOffer: 100n }), NOW), false);
});

test("cancelled order is skipped", () => {
  assert.equal(needsExpiry(order({ cancelled: true }), NOW), false);
});

test("missing or failed reads are skipped", () => {
  assert.equal(needsExpiry(undefined, NOW), false);
  assert.equal(needsExpiry({ error: "reverted" }, NOW), false);
});
