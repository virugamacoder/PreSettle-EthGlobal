import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ActiveIcon, HotSellingIcon, TrendingIcon } from "../assets/icons/index.jsx";
import { api } from "../lib/api.js";
import { formatAmount, shortAddress } from "../lib/format.js";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";

export function useAnalytics() {
  return useQuery({ queryKey: ["analytics"], queryFn: () => api.get("/analytics"), refetchInterval: 60_000 });
}

function StatCard({ Icon, title, rows }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="block h-4 w-4"><Icon /></span>
        {title}
      </p>
      {rows.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="num w-4 text-muted">{i + 1}</span>
                {r.to ? (
                  <Link to={r.to} className="truncate font-semibold hover:underline">{r.label}</Link>
                ) : (
                  <span className="truncate font-semibold">{r.label}</span>
                )}
              </span>
              <span className="num shrink-0 text-muted">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-5 text-center text-[15px] font-semibold text-muted">No Data</p>
      )}
    </div>
  );
}

/** OTC overview in the original style: Top Most Active / Top Hot Selling / Top Trending. */
export function MarketStats() {
  const { byAddress } = useTokens();
  const { data, error } = useAnalytics();
  if (error) return null; // optional: the order book still works without it

  const label = (t) => (t.symbol ? t.symbol : tokenLabel(byAddress, t.token));
  const active = (data?.activeMakers ?? []).slice(0, 3).map((m) => ({
    id: m.address,
    label: shortAddress(m.address),
    value: `${m.listings} listing${m.listings === 1 ? "" : "s"}`,
  }));
  const hot = (data?.mostViewed ?? []).slice(0, 3).map((v) => ({
    id: v.key,
    label: `Order ${v.key.slice(0, 8)}…`,
    to: `/otc/${v.key}`,
    value: `${v.views} view${v.views === 1 ? "" : "s"}`,
  }));
  const trending = (data?.trending ?? []).slice(0, 3).map((t) => ({
    id: t.token ?? t.symbol,
    label: label(t),
    value: `score ${t.score}`,
  }));
  const volume = data?.volume24h?.[0];

  return (
    <section aria-label="Market statistics" className="mb-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard Icon={ActiveIcon} title="Top Most Active" rows={active} />
        <StatCard Icon={HotSellingIcon} title="Top Hot Selling" rows={hot} />
        <StatCard Icon={TrendingIcon} title="Top Trending" rows={trending} />
      </div>
      {data && (
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <span><span className="num font-semibold text-ink">{data.openOrders}</span> open orders</span>
          <span><span className="num font-semibold text-ink">{data.premarketOffers}</span> premarket offers</span>
          <span><span className="num font-semibold text-ink">{data.fills24h}</span> fills in 24h</span>
          <span>
            <span className="num font-semibold text-ink">{volume ? formatAmount(volume.notional) : "0"}</span>{" "}
            {volume ? tokenLabel(byAddress, volume.quoteToken) : "USDC"} volume in 24h
          </span>
        </p>
      )}
    </section>
  );
}
