import { useState } from "react";
import { Link } from "react-router";
import { PageHeader, Panel, PillTabs, SectionTitle, EmptyState } from "../components/PageHeader.jsx";
import { MarketStats } from "../components/MarketStats.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { useOrders } from "../hooks/useOrders.js";
import { useTokens } from "../hooks/useTokens.js";
import { orientation } from "../contracts/otc.js";

// Tabs are from the visitor's side: "Buy" shows makers who sell, "Sell" shows makers who buy.
const TABS = [
  { value: "", label: "All" },
  { value: "sell", label: "Buy" },
  { value: "buy", label: "Sell" },
];

const pill = "h-11 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none";

export default function Otc() {
  const [side, setSide] = useState("");
  const [offerToken, setOfferToken] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [partialOnly, setPartialOnly] = useState(false);

  // The "token" filter is the base token: offered in sell orders, wanted in buy orders.
  const filters = {
    side: side || undefined,
    offerToken: side === "sell" && offerToken ? offerToken : undefined,
    wantToken: side === "buy" && offerToken ? offerToken : undefined,
    maxPrice: /^\d+(\.\d+)?$/.test(maxPrice) ? maxPrice : undefined,
    partial: partialOnly ? "true" : undefined,
  };
  const { tokens, byAddress } = useTokens();
  const { data, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders(filters);

  const allOrders = data?.pages.flatMap((p) => p.orders) ?? [];
  // With "All" sides the backend can't OR two columns, so filter the base token here.
  const orders =
    !side && offerToken
      ? allOrders.filter((o) => orientation(o).base?.toLowerCase() === offerToken.toLowerCase())
      : allOrders;
  const firstPage = data?.pages[0];
  const filteredOut = data?.pages.reduce((n, p) => n + (p.filteredOut || 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="OTC market"
        description="Peer-to-peer token deals in escrow on Arc. Every listing is an Arkiv entity owned by the maker's wallet and expires at its deadline."
        actions={
          <Link to="/create" className="rounded-full bg-brand-gradient px-5 py-2 text-sm font-semibold text-accent-ink">
            Create order
          </Link>
        }
      />

      <MarketStats />

      <SectionTitle>Fast Track</SectionTitle>
      <Panel
        toolbar={
          <>
            <PillTabs tabs={TABS} value={side} onChange={setSide} label="Side" />
            <select value={offerToken} onChange={(e) => setOfferToken(e.target.value)} className={pill} aria-label="Token">
              <option value="">Any token</option>
              {tokens.map((t) => (
                <option key={t.address} value={t.address}>{t.symbol}</option>
              ))}
            </select>
            <input
              inputMode="decimal"
              placeholder="Max price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.trim())}
              className={`${pill} num w-36 placeholder:text-muted`}
              aria-label="Max price"
            />
            <button
              type="button"
              onClick={() => setPartialOnly((v) => !v)}
              aria-pressed={partialOnly}
              className={`h-11 rounded-full border px-4 text-sm font-semibold ${partialOnly ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-muted"}`}
            >
              Partial fills only
            </button>
          </>
        }
      >
        {firstPage?.verification && firstPage.verification !== "arc" && (
          <p className="mb-4 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            Listings are shown unverified: the OTC contract address isn't configured on the backend yet.
          </p>
        )}

        {isLoading ? (
          <EmptyState title="Loading the order book…" compact />
        ) : error ? (
          <EmptyState title="Couldn't load the order book.">{error.message}</EmptyState>
        ) : orders.length === 0 ? (
          <EmptyState title="It seems no trades match right now.">
            <Link to="/create" className="font-semibold text-accent hover:underline">Create the first order</Link>
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
                  className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-60"
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
