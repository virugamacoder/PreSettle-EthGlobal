import { Link } from "react-router";
import { Send2Icon, TicketIcon, TrendingIcon, WalletIcon } from "../assets/icons/index.jsx";
import { useAnalytics } from "./MarketStats.jsx";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";
import { formatAmount } from "../lib/format.js";

function Update({ Icon, tone, title, text }) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
        <span className="block h-6 w-6"><Icon /></span>
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-sm text-muted">{text}</span>
      </span>
    </li>
  );
}

/** Right column in the original dashboard style: Hot Favorites, create buttons, Quick Updates. */
export function DashboardSidebar({ orders = [], fills = [] }) {
  const { byAddress } = useTokens();
  const { data } = useAnalytics();
  const trending = (data?.trending ?? []).slice(0, 4);
  const lastFill = fills.at(-1);
  const nextDeadline = orders.map((o) => o.deadline).filter(Boolean).sort((a, b) => a - b)[0];

  return (
    <aside className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Hot Favorites</h2>
        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted">
            <span className="block h-4 w-4"><TrendingIcon /></span> Trending
          </p>
          {trending.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {trending.map((t) => (
                <li key={t.token ?? t.symbol} className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold">
                  {t.symbol ?? tokenLabel(byAddress, t.token)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-5 text-center font-semibold text-muted">No Data</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/create?side=buy"
          className="flex flex-col items-center gap-2 rounded-2xl border border-accent px-3 py-4 text-sm font-semibold text-accent hover:bg-accent-soft"
        >
          <span className="block h-6 w-6"><WalletIcon /></span>
          Create Buy Request
        </Link>
        <Link
          to="/create?side=sell"
          className="flex flex-col items-center gap-2 rounded-2xl border border-accent px-3 py-4 text-sm font-semibold text-accent hover:bg-accent-soft"
        >
          <span className="block h-6 w-6"><Send2Icon /></span>
          Create Sell Request
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Quick Updates</h2>
        <ul className="rounded-2xl border border-line bg-surface-2 px-4">
          <Update
            Icon={WalletIcon}
            tone="bg-accent-soft"
            title="Last fill"
            text={lastFill ? `${formatAmount(lastFill.amount)} @ ${formatAmount(lastFill.price)}` : "–"}
          />
          <Update
            Icon={TicketIcon}
            tone="bg-[#d7f5ec] dark:bg-[#0d2b22]"
            title="Live orders"
            text={orders.length ? `${orders.length} on the order book` : "–"}
          />
          <Update
            Icon={Send2Icon}
            tone="bg-[#e4eaf9] dark:bg-[#141c33]"
            title="Next deadline"
            text={nextDeadline ? new Date(nextDeadline * 1000).toLocaleString() : "–"}
          />
        </ul>
      </section>
    </aside>
  );
}
