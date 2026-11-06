// Reference prices from CoinMarketCap (USD), by CoinMarketCap ID.
// Only used for display ("deal vs market"); deals themselves are priced in USDC/EURC.
import { config } from "../config.js";
import { httpError } from "../auth.js";

const CMC_URL = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest";
const CACHE_MS = 5 * 60 * 1000; // free plan: ~333 credits/day, so cache 5 minutes
const cache = new Map(); // id -> { at, value }

/** CoinMarketCap response -> { [id]: { id, symbol, name, usd, updatedAt } }. */
export function parseQuotes(body) {
  const out = {};
  for (const [id, entry] of Object.entries(body?.data ?? {})) {
    const item = Array.isArray(entry) ? entry[0] : entry; // v2 may return an array per key
    const usd = item?.quote?.USD?.price;
    if (item && typeof usd === "number") {
      out[id] = { id: Number(id), symbol: item.symbol, name: item.name, usd, updatedAt: item.quote.USD.last_updated };
    }
  }
  return out;
}

/** USD prices for CoinMarketCap IDs; only ids missing from the 5-minute cache are fetched. */
export async function getPrices(ids, fetchImpl = fetch) {
  if (!config.prices.coinMarketCapKey) throw httpError(503, "Prices are off: COINMARKETCAP_API_KEY is not set");
  const now = Date.now();
  const missing = ids.filter((id) => !(cache.get(id)?.at > now - CACHE_MS));

  if (missing.length) {
    const res = await fetchImpl(`${CMC_URL}?id=${missing.join(",")}`, {
      headers: { "X-CMC_PRO_API_KEY": config.prices.coinMarketCapKey, accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw httpError(502, `CoinMarketCap error: ${body?.status?.error_message || res.status}`);
    const quotes = parseQuotes(body);
    for (const id of missing) cache.set(id, { at: now, value: quotes[id] ?? null }); // cache misses too
  }

  return Object.fromEntries(ids.map((id) => [id, cache.get(id)?.value ?? null]));
}
