import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuotes } from "../src/services/prices.js";

const quote = (symbol, price) => ({ symbol, name: symbol, quote: { USD: { price, last_updated: "2026-11-06T12:00:00Z" } } });

test("parses CoinMarketCap v2 quotes keyed by id (object or array form)", () => {
  const body = { data: { 3408: quote("USDC", 0.9997), 20641: [quote("EURC", 1.1173)] } };
  assert.deepEqual(parseQuotes(body), {
    3408: { id: 3408, symbol: "USDC", name: "USDC", usd: 0.9997, updatedAt: "2026-11-06T12:00:00Z" },
    20641: { id: 20641, symbol: "EURC", name: "EURC", usd: 1.1173, updatedAt: "2026-11-06T12:00:00Z" },
  });
});

test("skips entries without a USD price and handles empty bodies", () => {
  assert.deepEqual(parseQuotes({ data: { 1: { symbol: "X", quote: {} } } }), {});
  assert.deepEqual(parseQuotes(null), {});
});
