import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../src/services/analytics.js";

const v = (value) => ({ value });
const BLOCK = 1_000_000n;
const DAY = 43_200n;
const XYZ = "0xAAAA000000000000000000000000000000000001";
const ABC = "0xBBBB000000000000000000000000000000000002";
const USDC = "0x3600000000000000000000000000000000000000";

const orders = [
  { side: v("sell"), offerToken: v(XYZ), wantToken: v(USDC), maker: v("0xM1") },
  { side: v("buy"), offerToken: v(USDC), wantToken: v(ABC), maker: v("0xM1") },
  { side: v("sell"), offerToken: v(XYZ), wantToken: v(USDC), maker: v("0xM2") },
];
const offers = [{ symbol: v("PRE"), seller: v("0xM3") }];
const fills = [
  { $createdAt: BLOCK - 10n, baseToken: v(XYZ), quoteToken: v(USDC), amount: v("100"), price: v("1.5") },
  { $createdAt: BLOCK - 2n * DAY, baseToken: v(ABC), quoteToken: v(USDC), amount: v("10"), price: v("2") },
  { $createdAt: BLOCK - 30n * DAY, baseToken: v(ABC), quoteToken: v(USDC), amount: v("999"), price: v("1") },
  { $createdAt: BLOCK - 5n, symbol: v("PRE"), quoteToken: v(USDC), amount: v("50"), price: v("0.2") },
];

test("counts listings and fills by period", () => {
  const s = summarize({ orders, offers, fills, currentBlock: BLOCK });
  assert.equal(s.openOrders, 3);
  assert.equal(s.premarketOffers, 1);
  assert.equal(s.fills24h, 2); // XYZ and PRE fills
  assert.equal(s.fills7d, 3); // the 30-day-old fill is excluded
});

test("24h volume is amount x price per quote token", () => {
  const s = summarize({ orders, offers, fills, currentBlock: BLOCK });
  assert.deepEqual(s.volume24h, [{ quoteToken: USDC.toLowerCase(), notional: 160 }]); // 150 + 10
});

test("trending ranks recent fills above listings and handles premarket symbols", () => {
  const s = summarize({ orders, offers, fills, currentBlock: BLOCK });
  // XYZ: 1 fill*3 + 2 listings = 5; ABC: 1 fill*3 + 1 listing = 4; PRE: 1*3 + 1 = 4
  assert.deepEqual(s.trending[0], { token: XYZ.toLowerCase(), score: 5 });
  assert.ok(s.trending.some((t) => t.symbol === "PRE" && t.score === 4));
});

test("most active makers by live listings", () => {
  const s = summarize({ orders, offers, fills, currentBlock: BLOCK });
  assert.deepEqual(s.activeMakers[0], { address: "0xm1", listings: 2 });
});
