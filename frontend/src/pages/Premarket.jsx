import { useState } from "react";
import { Link } from "react-router";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { ArkivBadge, Pill } from "../components/OrderList.jsx";
import { usePremarketOffers } from "../hooks/usePremarket.js";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";
import { formatAmount, shortAddress, timeLeft } from "../lib/format.js";
import { mulDecimal } from "../lib/amounts.js";

export default function Premarket() {
  const [symbol, setSymbol] = useState("");
  const { byAddress } = useTokens();
  const all = usePremarketOffers();
  const offers = (all.data ?? []).filter((o) => !symbol || o.symbol === symbol);
  const symbols = [...new Set((all.data ?? []).map((o) => o.symbol))].sort();

  return (
    <>
      <PageHeader
        title="Premarket"
        description="Buy tokens before they launch. Sellers lock 100% of the deal value as collateral in escrow on Arc; if they don't deliver the real tokens after TGE, buyers receive that collateral."
        actions={<Link to="/create?tab=premarket" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Create offer</Link>}
      />

      {symbols.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {["", ...symbols].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setSymbol(s)}
              className={`rounded-full border px-3 py-1 text-sm ${symbol === s ? "border-accent text-accent" : "border-line text-muted hover:text-ink"}`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      )}

      {all.isLoading ? (
        <EmptyState title="Loading offers…" />
      ) : all.error ? (
        <EmptyState title="Couldn't load offers">{all.error.message}</EmptyState>
      ) : offers.length === 0 ? (
        <EmptyState title="No live premarket offers">
          <Link to="/create?tab=premarket" className="text-accent hover:underline">Create the first offer</Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => {
            const coll = tokenLabel(byAddress, o.collateralToken);
            return (
              <li key={o.key} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{o.symbol}</span>
                  <Pill tone={o.tge > Date.now() / 1000 ? "accent" : "warn"}>
                    {o.tge > Date.now() / 1000 ? `TGE in ${timeLeft(o.tge)}` : "TGE passed"}
                  </Pill>
                </div>
                <dl className="grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-muted">Price</dt>
                  <dd className="num text-right">{formatAmount(o.price)} {coll}</dd>
                  <dt className="text-muted">Amount</dt>
                  <dd className="num text-right">{formatAmount(o.tokenAmount)} {o.symbol}</dd>
                  <dt className="text-muted">Collateral</dt>
                  <dd className="num text-right">{formatAmount(mulDecimal(o.tokenAmount, o.price))} {coll}</dd>
                  <dt className="text-muted">Seller</dt>
                  <dd className="text-right" title={o.seller}>{shortAddress(o.seller)}</dd>
                </dl>
                <div className="mt-auto flex items-center justify-between">
                  <ArkivBadge entityKey={o.key} />
                  <Link to={`/premarket/${o.key}`} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink">View offer</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
