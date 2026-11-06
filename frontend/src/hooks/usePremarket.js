import { useQuery } from "@tanstack/react-query";
import { useReadContract, useReadContracts } from "wagmi";
import { NoEntityFoundError } from "@arkiv-network/sdk";
import { asc, eq } from "@arkiv-network/sdk/query";
import { arkivPublic } from "../arkiv/client.js";
import { PremarketOffer } from "../arkiv/schemas.js";
import { PREMARKET_ABI } from "../contracts/premarket.js";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";

const v = (row, col) => row[col]?.value ?? null;

function toOffer(e, key = e.$key) {
  return {
    key,
    owner: e.$owner,
    seller: v(e, "seller"),
    marketId: v(e, "marketId")?.toString(),
    symbol: v(e, "symbol"),
    collateralToken: v(e, "collateralToken"),
    price: v(e, "price"),
    tokenAmount: v(e, "tokenAmount"),
    offerId: v(e, "offerId")?.toString(),
    tge: Number(v(e, "tge")),
    arcTx: v(e, "arcTx"),
  };
}

/** Live premarket offers this wallet created (Arkiv entities it owns). */
export function useMyPremarketOffers(address) {
  return useQuery({
    queryKey: ["my-pm-offers", address],
    enabled: Boolean(address),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { entities } = await arkivPublic.select("*").from(PremarketOffer).ownedBy(address).orderBy(asc("$key")).limit(100).fetch();
      return entities.map((e) => toOffer(e));
    },
  });
}

/** Live premarket offers from the Arkiv order book, optionally for one symbol. */
export function usePremarketOffers(symbol) {
  return useQuery({
    queryKey: ["pm-offers", symbol],
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = arkivPublic.select("*").from(PremarketOffer);
      if (symbol) q = q.where(eq("symbol", symbol));
      const { entities } = await q.orderBy(asc("$key")).limit(100).fetch();
      return entities.map((e) => toOffer(e));
    },
  });
}

/** One premarket offer listing by Arkiv key; null when expired or removed. */
export function usePremarketListing(key) {
  return useQuery({
    queryKey: ["pm-offer", key],
    enabled: Boolean(key),
    queryFn: async () => {
      try {
        return toOffer(await arkivPublic.getEntity(key, PremarketOffer), key);
      } catch (err) {
        if (err instanceof NoEntityFoundError) return null;
        throw err;
      }
    },
  });
}

const enabled = Boolean(settings.arc.premarket);
const contract = { chainId: arcTestnet.id, address: settings.arc.premarket ?? undefined, abi: PREMARKET_ABI };

/** All markets defined in the contract (admin-created). */
export function useMarkets() {
  const count = useReadContract({ ...contract, functionName: "marketCount", query: { enabled } });
  const n = Number(count.data ?? 0n);
  const markets = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({ ...contract, functionName: "getMarket", args: [BigInt(i)] })),
    query: { enabled: enabled && n > 0 },
  });
  const list = (markets.data ?? [])
    .map((r, i) => (r.status === "success" ? { id: String(i), ...r.result } : null))
    .filter(Boolean);
  return { markets: list, isLoading: count.isLoading || markets.isLoading, refetch: () => (count.refetch(), markets.refetch()) };
}

export function useOnchainOffer(offerId) {
  return useReadContract({
    ...contract,
    functionName: "getOffer",
    args: offerId != null ? [BigInt(offerId)] : undefined,
    query: { enabled: enabled && offerId != null, refetchInterval: 20_000 },
  });
}

export function useMarket(marketId) {
  return useReadContract({
    ...contract,
    functionName: "getMarket",
    args: marketId != null ? [BigInt(marketId)] : undefined,
    query: { enabled: enabled && marketId != null },
  });
}

export function usePurchase(offerId, buyer) {
  return useReadContract({
    ...contract,
    functionName: "purchases",
    args: offerId != null && buyer ? [BigInt(offerId), buyer] : undefined,
    query: { enabled: enabled && offerId != null && Boolean(buyer) },
  });
}
