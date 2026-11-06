import { useQuery } from "@tanstack/react-query";
import { asc } from "@arkiv-network/sdk/query";
import { arkivPublic } from "../arkiv/client.js";
import { Token } from "../arkiv/schemas.js";
import { settings } from "../config/env.js";

// Always available on Arc, even before the admin publishes a token list.
const BUILT_IN = [
  { address: settings.arc.usdc, symbol: "USDC", name: "USD Coin", decimals: 6, kind: "collateral", cmcId: 3408 },
  { address: settings.arc.eurc, symbol: "EURC", name: "Euro Coin", decimals: 6, kind: "collateral", cmcId: 20641 },
];

/**
 * Curated token list from Arkiv (written only by the admin wallet), merged
 * with the built-in stablecoins.
 * Returns:
 * - tokens:   tradable tokens (kind "otc" / "collateral") + USDC/EURC
 * - byAddress
 * - premarketLogos: { SYMBOL: logoUrl } from kind "premarket" entries
 *   (a pre-launch token has no address yet, so its logo is keyed by symbol)
 * - listed:   every published entry with its Arkiv key (for the admin table)
 */
export function useTokens() {
  const query = useQuery({
    queryKey: ["tokens", settings.arkiv.adminAddress],
    enabled: Boolean(settings.arkiv.adminAddress),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { entities } = await arkivPublic
        .select({ $key: true, $createdAt: true, address: true, symbol: true, name: true, decimals: true, kind: true, logo: true, cmcId: true })
        .from(Token)
        .createdBy(settings.arkiv.adminAddress)
        .orderBy(asc("$key"))
        .limit(100)
        .fetch();
      return entities.map((e) => ({
        key: e.$key,
        createdAt: e.$createdAt ?? 0n,
        address: e.address.value,
        symbol: e.symbol.value,
        name: e.name.value,
        decimals: Number(e.decimals.value),
        kind: e.kind.value,
        logo: e.logo?.value ?? null,
        cmcId: e.cmcId ? Number(e.cmcId.value) : null,
      }));
    },
  });

  const listed = query.data || [];
  const all = [...BUILT_IN];
  for (const t of listed) {
    if (t.kind === "premarket") continue;
    if (!all.some((x) => x.address.toLowerCase() === t.address.toLowerCase())) all.push(t);
  }
  const byAddress = Object.fromEntries(all.map((t) => [t.address.toLowerCase(), t]));

  // Newest logo per premarket symbol wins.
  const premarketLogos = {};
  for (const t of [...listed].filter((x) => x.kind === "premarket" && x.logo).sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1))) {
    premarketLogos[t.symbol.toUpperCase()] = t.logo;
  }

  return { tokens: all, byAddress, premarketLogos, listed, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function tokenLabel(byAddress, address) {
  if (!address) return "?";
  return byAddress[address.toLowerCase()]?.symbol ?? `${address.slice(0, 6)}…`;
}
