import { test } from "node:test";
import assert from "node:assert/strict";
import { verify } from "../src/services/orders.js";

const MAKER = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const NOW = 1_800_000_000;

const listing = { owner: MAKER };
const onchain = (over = {}) => ({
  maker: MAKER,
  cancelled: false,
  deadline: BigInt(NOW + 3600),
  offerAmount: 100n,
  filledOffer: 40n,
  ...over,
});

test("open order whose listing owner is the maker is verified", () => {
  assert.deepEqual(verify(listing, onchain(), NOW), { verified: true, remainingOffer: "60" });
});

test("maker address comparison ignores case", () => {
  assert.equal(verify({ owner: MAKER.toUpperCase().replace("0X", "0x") }, onchain(), NOW).verified, true);
});

test("listing written by someone other than the maker is rejected (spoofed)", () => {
  const r = verify({ owner: OTHER }, onchain(), NOW);
  assert.equal(r.verified, false);
  assert.match(r.reason, /not the on-chain maker/);
});

test("missing on-chain order is rejected", () => {
  assert.equal(verify(listing, undefined, NOW).verified, false);
});

test("failed contract call is rejected with its reason", () => {
  assert.deepEqual(verify(listing, { error: "execution reverted" }, NOW), {
    verified: false,
    reason: "execution reverted",
  });
});

test("cancelled order is rejected", () => {
  assert.equal(verify(listing, onchain({ cancelled: true }), NOW).reason, "cancelled");
});

test("order at or past its deadline is rejected", () => {
  assert.equal(verify(listing, onchain({ deadline: BigInt(NOW) }), NOW).reason, "expired");
});

test("fully filled order is rejected", () => {
  assert.equal(verify(listing, onchain({ filledOffer: 100n }), NOW).reason, "fully filled");
});
