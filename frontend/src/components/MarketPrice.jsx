import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { formatAmount } from "../lib/format.js";

/** USD reference prices by CoinMarketCap ID (backend caches them for 5 minutes). */
export function usePrices(ids) {
  const list = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].sort((a, b) => a - b);
  const { data } = useQuery({
    queryKey: ["prices", list],
    enabled: list.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: () => api.get("/prices", { ids: list.join(",") }),
  });
  return data ?? {};
}

/**
 * "Market price" row for an order: the token's CoinMarketCap USD price and how
 * the deal price (in the quote stablecoin, converted to USD) compares to it.
 * Renders nothing when the token has no CoinMarketCap ID or no price.
 */
export function MarketPrice({ baseToken, quoteToken, dealPrice }) {
  const prices = usePrices([baseToken?.cmcId, quoteToken?.cmcId]);
  const market = prices[baseToken?.cmcId]?.usd;
  if (!market) return null;

  const quoteUsd = prices[quoteToken?.cmcId]?.usd ?? 1; // USDC ≈ $1, EURC ≈ EUR/USD
  const dealUsd = Number(dealPrice) * quoteUsd;
  const diff = (dealUsd / market - 1) * 100;
  const tone = Math.abs(diff) < 0.5 ? "text-muted" : diff < 0 ? "text-buy" : "text-sell";
  const text = Math.abs(diff) < 0.5 ? "at market" : `${Math.abs(diff).toFixed(1)}% ${diff < 0 ? "below" : "above"} market`;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">Market price</span>
      <span className="text-right">
        <span className="num">${formatAmount(market)}</span>{" "}
        <span className={tone}>· deal is {text}</span>
        <span className="block text-xs text-muted">CoinMarketCap reference, updated every 5 min</span>
      </span>
    </div>
  );
}
