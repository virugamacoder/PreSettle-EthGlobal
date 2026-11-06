import { useQuery } from "@tanstack/react-query";
import { asc } from "@arkiv-network/sdk/query";
import { arkivPublic } from "../arkiv/client.js";
import { Token } from "../arkiv/schemas.js";
import { settings } from "../config/env.js";

// Always available on Arc, even before the admin publishes a token list.
const BUILT_IN = [
  { address: settings.arc.usdc, symbol: "USDC", name: "USD Coin", decimals: 6, kind: "collateral" },
  { address: settings.arc.eurc, symbol: "EURC", name: "Euro Coin", decimals: 6, kind: "collateral" },
];

/**
 * Curated token list from Arkiv (written only by the admin wallet), merged
 * with the built-in stablecoins. Returns { tokens, byAddress, isLoading }.
 */
export function useTokens() {
  const query = useQuery({
    queryKey: ["tokens", settings.arkiv.adminAddress],
    enabled: Boolean(settings.arkiv.adminAddress),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { entities } = await arkivPublic
        .select({ address: true, symbol: true, name: true, decimals: true, kind: true, logo: true })
        .from(Token)
        .createdBy(settings.arkiv.adminAddress)
        .orderBy(asc("$key"))
        .limit(100)
        .fetch();
      return entities.map((e) => ({
        address: e.address.value,
        symbol: e.symbol.value,
        name: e.name.value,
        decimals: Number(e.decimals.value),
        kind: e.kind.value,
        logo: e.logo?.value ?? null,
      }));
    },
  });

  const all = [...BUILT_IN];
  for (const t of query.data || []) {
    if (!all.some((x) => x.address.toLowerCase() === t.address.toLowerCase())) all.push(t);
  }
  const byAddress = Object.fromEntries(all.map((t) => [t.address.toLowerCase(), t]));

  return { tokens: all, byAddress, isLoading: query.isLoading, error: query.error };
}

export function tokenLabel(byAddress, address) {
  if (!address) return "?";
  return byAddress[address.toLowerCase()]?.symbol ?? `${address.slice(0, 6)}…`;
}
