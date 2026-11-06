import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { formatAmount, shortAddress } from "../lib/format.js";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="num mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Market banner: live counts, 24h volume, trending tokens (computed from Arkiv by the backend). */
export function MarketStats() {
  const { byAddress } = useTokens();
  const { data, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get("/analytics"),
    refetchInterval: 60_000,
  });

  if (error) return null; // the banner is optional; the order book still works
  const volume = data?.volume24h ?? [];
  const label = (t) => (t.symbol ? t.symbol : tokenLabel(byAddress, t.token));

  return (
    <section aria-label="Market statistics" className="mb-6 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open OTC orders" value={data ? data.openOrders : "–"} />
        <Stat label="Premarket offers" value={data ? data.premarketOffers : "–"} />
        <Stat label="Fills (24h)" value={data ? data.fills24h : "–"} hint={data ? `${data.fills7d} in 7 days` : null} />
        <Stat
          label="Volume (24h)"
          value={volume.length ? formatAmount(volume[0].notional) : data ? "0" : "–"}
          hint={volume.length ? tokenLabel(byAddress, volume[0].quoteToken) : null}
        />
      </div>
      {data?.trending?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Trending:</span>
          {data.trending.map((t, i) => (
            <span key={t.token ?? t.symbol} className="rounded-full border border-line bg-surface px-3 py-1">
              <span className="text-muted">#{i + 1}</span> {label(t)}
            </span>
          ))}
          {data.activeMakers?.[0] && (
            <span className="ml-auto text-xs text-muted">Most active maker: {shortAddress(data.activeMakers[0].address)}</span>
          )}
        </div>
      )}
    </section>
  );
}
