// Runnable query for Arkiv judges: lists the live SettleX order book on the
// Arkiv Rabdi testnet. Read-only; no wallet or key needed.
//
//   cd backend && npm install && node scripts/arkiv-query.js
//   node scripts/arkiv-query.js 0xMakerAddress   # only that maker's listings
import { asc } from "@arkiv-network/sdk/query";
import { arkivPublic } from "../src/chains.js";
import { OtcOrder, PremarketOffer, BrokerLink, Fill } from "../src/arkiv/schemas.js";

const owner = process.argv[2];

async function list(label, schema, select) {
  let q = arkivPublic.select({ $key: true, $owner: true, $expiresAt: true, ...select }).from(schema);
  if (owner) q = q.ownedBy(owner);
  q = q.orderBy(asc("$key")).limit(20);
  console.log(`\n${label}\n  query: ${q.toString()}`);
  const { entities } = await q.fetch();
  if (!entities.length) console.log("  (no live entities)");
  for (const e of entities) {
    const fields = Object.entries(select)
      .map(([k]) => `${k}=${e[k]?.value ?? "-"}`)
      .join(" ");
    console.log(`  ${e.$key}  owner=${e.$owner}  expiresAtBlock=${e.$expiresAt}  ${fields}`);
  }
}

await list("OTC orders", OtcOrder, { side: true, offerToken: true, wantToken: true, price: true, amount: true, orderId: true });
await list("Premarket offers", PremarketOffer, { symbol: true, price: true, tokenAmount: true, offerId: true, tge: true });
await list("Broker deal links (10-minute lifetime)", BrokerLink, { brokerEns: true, client: true, price: true, amount: true });
await list("Fills (read-only records)", Fill, { market: true, refId: true, amount: true, price: true });
