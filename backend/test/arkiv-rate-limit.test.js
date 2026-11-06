import { test } from "node:test";
import assert from "node:assert/strict";
import { isArkivRateLimit } from "../src/chains.js";

test("HTTP 429 status is a rate limit", () => {
  assert.equal(isArkivRateLimit({ status: 429, message: "HTTP request failed." }), true);
});

test("Arkiv ANON_COST_LIMITED body is a rate limit", () => {
  const err = {
    message: "HTTP request failed.",
    details: '{"error":"ANON_COST_LIMITED","message":"unauthenticated query budget exhausted"}',
  };
  assert.equal(isArkivRateLimit(err), true);
});

test("nested cause is checked", () => {
  assert.equal(isArkivRateLimit({ message: "query failed", cause: { message: "Status: 429" } }), true);
});

test("other errors are not rate limits", () => {
  assert.equal(isArkivRateLimit({ status: 500, message: "execution reverted" }), false);
  assert.equal(isArkivRateLimit(undefined), false);
});
