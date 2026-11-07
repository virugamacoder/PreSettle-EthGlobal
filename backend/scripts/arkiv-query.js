// Read-only queries against the live Pre Settle order book on Arkiv (Rabdi testnet).
// For Arkiv judges: no wallet needed. Each section prints the query text the node receives.
//
//   cd backend && npm install && node scripts/arkiv-query.js
//   node scripts/arkiv-query.js 0xWallet     # only entities owned by that wallet
import { and, asc, eq, lte } from "@arkiv-network/sdk/query";
import { dec } from "@arkiv-network/sdk/schema";
import { arkivPublic } from "../src/chains.js";
import { config } from "../src/config.js";
import { OtcOrder, PremarketOffer, Fill, Token } from "../src/arkiv/schemas.js";

const owner = process.argv[2];
// Wallet that publishes the curated token list (falls back to Pre Settle's admin).
const admin = config.arkiv.adminAddress ?? "0xfEceA7b046b4DaFACE340c7A2fe924cf41b6d274";

/** Runs one query and prints its text and rows. */
async function run(title, query, fields) {
  console.log(`\n${title}\n  query: ${query.toString()}`);
  const { entities } = await query.fetch();
  if (!entities.length) console.log("  (no live entities)");
  for (const e of entities) {
    const extra = fields.map((f) => `${f}=${e[f]?.value ?? "-"}`).join(" ");
    const flags = e.$creationFlags ? ` readonly=${e.$creationFlags.readonly}` : "";
    console.log(`  ${e.$key}  owner=${e.$owner}  expiresAtBlock=${e.$expiresAt}${flags}  ${extra}`);
  }
  return entities;
}

/** select(...).from(schema), optionally limited to one owner. */
const base = (schema, select) => {
  const q = arkivPublic.select({ $key: true, $owner: true, $expiresAt: true, ...select }).from(schema);
  return owner ? q.ownedBy(owner) : q;
};

// 1. OTC orders: each one expires on Arkiv at its on-chain deadline.
await run("1. OTC orders", base(OtcOrder, { side: true, offerToken: true, wantToken: true, price: true, amount: true, orderId: true })
  .orderBy(asc("$key")).limit(20), ["side", "price", "amount", "orderId"]);

// 2. OTC filter, as on the OTC page: sell orders priced at or below 100.
await run("2. Sell orders with price <= 100", base(OtcOrder, { side: true, price: true, amount: true })
  .where(and(eq("side", "sell"), lte("price", dec("100")))).orderBy(asc("$key")).limit(20), ["side", "price", "amount"]);

// 3. OTC orders that expire soonest (sorted by Arkiv's expiry block).
await run("3. OTC orders expiring soonest", base(OtcOrder, { price: true, deadline: true })
  .orderBy(asc("$expiresAt")).limit(5), ["price", "deadline"]);

// 4. Premarket offers: each one expires after TGE + the delivery window.
const offers = await run("4. Premarket offers", base(PremarketOffer, { symbol: true, price: true, tokenAmount: true, offerId: true, tge: true })
  .orderBy(asc("$key")).limit(20), ["symbol", "price", "tokenAmount", "offerId"]);

// 5. Premarket offers for one token, as on the Premarket token tabs.
if (offers.length) {
  const symbol = offers[0].symbol.value;
  await run(`5. Premarket offers for ${symbol}`, base(PremarketOffer, { symbol: true, price: true, tokenAmount: true })
    .where(eq("symbol", symbol)).orderBy(asc("$key")).limit(20), ["symbol", "price", "tokenAmount"]);
}

// 6. Fills: trade records created read-only, so nobody can edit them.
await run("6. Fills (read-only records)", base(Fill, { $creationFlags: true, market: true, refId: true, amount: true, price: true })
  .orderBy(asc("$key")).limit(20), ["market", "refId", "amount", "price"]);

// 7. Token list: trusted only when written by the admin wallet (createdBy).
await run(`7. Token list created by ${admin}`, arkivPublic
  .select({ $key: true, $owner: true, $expiresAt: true, symbol: true, kind: true, address: true })
  .from(Token).createdBy(admin).orderBy(asc("$key")).limit(20), ["symbol", "kind", "address"]);
