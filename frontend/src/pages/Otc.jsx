import { useState } from "react";
import { Link } from "react-router";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { useOrders } from "../hooks/useOrders.js";
import { useTokens } from "../hooks/useTokens.js";

const SIDES = [
  { value: "", label: "All" },
  { value: "sell", label: "Selling" },
  { value: "buy", label: "Buying" },
];

export default function Otc() {
  const [side, setSide] = useState("");
  const [offerToken, setOfferToken] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [partialOnly, setPartialOnly] = useState(false);

  const filters = {
    side: side || undefined,
    offerToken: offerToken || undefined,
    maxPrice: /^\d+(\.\d+)?$/.test(maxPrice) ? maxPrice : undefined,
    partial: partialOnly ? "true" : undefined,
  };
  const { tokens, byAddress } = useTokens();
  const { data, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders(filters);

  const orders = data?.pages.flatMap((p) => p.orders) ?? [];
  const firstPage = data?.pages[0];
  const filteredOut = data?.pages.reduce((n, p) => n + (p.filteredOut || 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="OTC market"
        description="Peer-to-peer token deals in escrow on Arc. Every listing is an Arkiv entity owned by the maker's wallet and expires at its deadline."
        actions={
          <Link to="/create" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
            Create order
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex rounded-lg border border-line bg-surface p-1" role="tablist" aria-label="Side">
          {SIDES.map((s) => (
            <button
              key={s.value}
              role="tab"
              aria-selected={side === s.value}
              onClick={() => setSide(s.value)}
              className={`rounded-md px-3 py-1.5 text-sm ${side === s.value ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Token
          <select
            value={offerToken}
            onChange={(e) => setOfferToken(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Any token</option>
            {tokens.map((t) => (
              <option key={t.address} value={t.address}>{t.symbol}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Max price
          <input
            inputMode="decimal"
            placeholder="e.g. 1.5"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.trim())}
            className="num w-32 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm text-muted">
          <input type="checkbox" checked={partialOnly} onChange={(e) => setPartialOnly(e.target.checked)} />
          Partial fills only
        </label>
      </div>

      {firstPage?.verification && firstPage.verification !== "arc" && (
        <p className="mb-4 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          Listings are shown unverified: the OTC contract address isn't configured on the backend yet.
        </p>
      )}

      {isLoading ? (
        <EmptyState title="Loading the order book…" />
      ) : error ? (
        <EmptyState title="Couldn't load orders">{error.message}</EmptyState>
      ) : orders.length === 0 ? (
        <EmptyState title="No open orders match">
          <Link to="/create" className="text-accent hover:underline">Create the first order</Link>
        </EmptyState>
      ) : (
        <>
          <OrderList orders={orders} byAddress={byAddress} />
          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>{filteredOut > 0 && `${filteredOut} listing(s) hidden: failed on-chain verification`}</span>
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-md border border-line px-3 py-1.5 text-sm text-ink disabled:opacity-60"
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
