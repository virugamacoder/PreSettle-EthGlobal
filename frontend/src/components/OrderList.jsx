import { Link } from "react-router";
import { arkivExplorer } from "../arkiv/client.js";
import { formatAmount, shortAddress, timeLeft } from "../lib/format.js";
import { tokenLabel } from "../hooks/useTokens.js";
import { orientation } from "../contracts/otc.js";

export function Pill({ tone = "muted", children }) {
  const tones = {
    muted: "border-line text-muted",
    buy: "border-buy/40 bg-buy/10 text-buy",
    sell: "border-sell/40 bg-sell/10 text-sell",
    accent: "border-accent/40 bg-accent/10 text-accent",
    warn: "border-warn/40 bg-warn/10 text-warn",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ArkivBadge({ entityKey }) {
  return (
    <a
      href={arkivExplorer.entity(entityKey)}
      target="_blank"
      rel="noreferrer"
      title="This listing is an Arkiv entity owned by the maker's wallet"
      className="text-xs text-muted hover:text-accent"
    >
      📦 Arkiv
    </a>
  );
}

/** Price is quote per 1 base; amount is in base (see contracts/otc.js). */
function describe(order, byAddress) {
  const { base, quote } = orientation(order);
  const b = tokenLabel(byAddress, base);
  const q = tokenLabel(byAddress, quote);
  return { offer: b, want: q, pair: `${b} / ${q}` };
}

export function OrderList({ orders, byAddress }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Side</th>
            <th className="px-4 py-3 font-medium">Pair</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Lot</th>
            <th className="px-4 py-3 font-medium">Maker</th>
            <th className="px-4 py-3 font-medium">Ends</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const d = describe(o, byAddress);
            return (
              <tr key={o.key} className="border-b border-line last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3">
                  <Pill tone={o.side === "sell" ? "sell" : "buy"}>{o.side === "sell" ? "Selling" : "Buying"}</Pill>
                </td>
                <td className="px-4 py-3 font-medium">{d.pair}</td>
                <td className="num px-4 py-3 text-right">
                  {formatAmount(o.price)} <span className="text-muted">{d.want}</span>
                </td>
                <td className="num px-4 py-3 text-right">
                  {formatAmount(o.amount)} <span className="text-muted">{d.offer}</span>
                </td>
                <td className="px-4 py-3">{o.partial ? <Pill>Partial</Pill> : <Pill tone="warn">Full</Pill>}</td>
                <td className="px-4 py-3">
                  <span title={o.maker}>{o.makerEns || shortAddress(o.maker)}</span>
                  {o.brokerEns && <div className="text-xs text-accent">via {o.brokerEns}</div>}
                </td>
                <td className="num px-4 py-3 text-muted">{timeLeft(o.deadline)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <ArkivBadge entityKey={o.key} />
                    <Link to={`/otc/${o.key}`} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink">
                      {o.side === "sell" ? "Buy" : "Sell"}
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile: cards */}
      <ul className="divide-y divide-line md:hidden">
        {orders.map((o) => {
          const d = describe(o, byAddress);
          return (
            <li key={o.key} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.pair}</span>
                <Pill tone={o.side === "sell" ? "sell" : "buy"}>{o.side === "sell" ? "Selling" : "Buying"}</Pill>
              </div>
              <div className="num text-sm">
                {formatAmount(o.amount)} {d.offer} @ {formatAmount(o.price)} {d.want}
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{o.makerEns || shortAddress(o.maker)} · ends {timeLeft(o.deadline)}</span>
                <ArkivBadge entityKey={o.key} />
              </div>
              <Link to={`/otc/${o.key}`} className="rounded-md bg-accent px-3 py-2 text-center text-sm font-semibold text-accent-ink">
                {o.side === "sell" ? "Buy" : "Sell"}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
