// Market analytics computed from the Arkiv order book (no database):
// live OTC orders, live premarket offers and fill records.
import { asc, gt } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/schema";
import { arkivPublic } from "../chains.js";
import { Fill, OtcOrder, PremarketOffer } from "../arkiv/schemas.js";

const BLOCK_SECONDS = 2n;
const DAY_BLOCKS = 86_400n / BLOCK_SECONDS;
const MAX_PAGES = 10; // up to 1000 entities per kind
const CACHE_MS = 60_000;

let cache = { at: 0, data: null, pending: null };

async function fetchAll(schema, select) {
  const rows = [];
  let lastKey;
  for (let page = 0; page < MAX_PAGES; page++) {
    let q = arkivPublic.select({ $key: true, ...select }).from(schema);
    if (lastKey) q = q.where(gt("$key", key(lastKey)));
    const { entities } = await q.orderBy(asc("$key")).limit(100).fetch();
    rows.push(...entities);
    if (entities.length < 100) break;
    lastKey = entities.at(-1).$key;
  }
  return rows;
}

const val = (row, col) => row[col]?.value ?? null;
const lower = (a) => (a ? String(a).toLowerCase() : null);

function bump(map, k, by = 1) {
  if (!k) return;
  map.set(k, (map.get(k) ?? 0) + by);
}

const top = (map, n) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, value]) => ({ id, value }));

export function summarize({ orders, offers, fills, currentBlock }) {
  const dayAgo = currentBlock - DAY_BLOCKS;
  const weekAgo = currentBlock - 7n * DAY_BLOCKS;

  const listings = new Map(); // base token / symbol -> live listings
  const makers = new Map();
  for (const o of orders) {
    const base = val(o, "side") === "sell" ? val(o, "offerToken") : val(o, "wantToken");
    bump(listings, lower(base));
    bump(makers, lower(val(o, "maker")));
  }
  for (const o of offers) {
    bump(listings, `symbol:${val(o, "symbol")}`);
    bump(makers, lower(val(o, "seller")));
  }

  const fills7d = new Map(); // token -> fills in the last 7 days
  const volume24h = new Map(); // quote token -> amount * price
  let fills24h = 0;
  let fillsWeek = 0;
  for (const f of fills) {
    const created = f.$createdAt ?? 0n;
    if (created < weekAgo) continue;
    fillsWeek += 1;
    const token = val(f, "baseToken") ? lower(val(f, "baseToken")) : val(f, "symbol") ? `symbol:${val(f, "symbol")}` : null;
    bump(fills7d, token);
    if (created >= dayAgo) {
      fills24h += 1;
      const notional = Number(val(f, "amount")) * Number(val(f, "price"));
      if (Number.isFinite(notional)) bump(volume24h, lower(val(f, "quoteToken")) ?? "unknown", notional);
    }
  }

  // Trending: recent fills weigh more than open listings.
  const score = new Map();
  for (const [t, n] of fills7d) bump(score, t, n * 3);
  for (const [t, n] of listings) bump(score, t, n);

  return {
    openOrders: orders.length,
    premarketOffers: offers.length,
    fills24h,
    fills7d: fillsWeek,
    volume24h: top(volume24h, 10).map(({ id, value }) => ({ quoteToken: id, notional: Number(value.toFixed(6)) })),
    trending: top(score, 5).map(({ id, value }) =>
      id.startsWith("symbol:") ? { symbol: id.slice(7), score: value } : { token: id, score: value },
    ),
    activeMakers: top(makers, 5).map(({ id, value }) => ({ address: id, listings: value })),
  };
}

/** Cached for 60 s so the banner doesn't spend Arkiv quota on every page view. */
export async function getAnalytics() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) return cache.data;
  if (cache.pending) return cache.pending;

  cache.pending = (async () => {
    const [orders, offers, fills, currentBlock] = await Promise.all([
      fetchAll(OtcOrder, { side: true, offerToken: true, wantToken: true, maker: true }),
      fetchAll(PremarketOffer, { symbol: true, seller: true }),
      fetchAll(Fill, { $createdAt: true, baseToken: true, quoteToken: true, symbol: true, amount: true, price: true }),
      arkivPublic.getBlockNumber(),
    ]);
    const data = { ...summarize({ orders, offers, fills, currentBlock }), updatedAt: new Date().toISOString() };
    cache = { at: Date.now(), data, pending: null };
    return data;
  })();

  try {
    return await cache.pending;
  } finally {
    cache.pending = null;
  }
}
