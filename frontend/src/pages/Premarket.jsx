import { useState } from "react";
import { Link } from "react-router";
import { PageHeader, Panel, SectionTitle, EmptyState } from "../components/PageHeader.jsx";
import { TokenAvatar, TokenBanners } from "../components/TokenBanners.jsx";
import { ArkivBadge } from "../components/OrderList.jsx";
import { MarketStats } from "../components/MarketStats.jsx";
import { EyeGrayIcon, SearchIcon } from "../assets/icons/index.jsx";
import { usePremarketOffers } from "../hooks/usePremarket.js";
import { useViewCounts } from "../hooks/useViews.js";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";
import { formatAmount, shortAddress, timeLeft } from "../lib/format.js";
import { mulDecimal } from "../lib/amounts.js";

function DealCard({ offer: o, coll, views, logo }) {
  const preTge = o.tge > Date.now() / 1000;
  return (
    <li className="flex flex-col rounded-[14px] border border-line bg-surface p-3.5">
      <div className="flex items-center gap-2.5">
        <TokenAvatar symbol={o.symbol} logo={logo} />
        <div className="flex flex-1 items-center justify-between">
          <div>
            <p className="font-semibold leading-tight">{o.symbol}</p>
            <p className="text-xs font-medium text-muted">Pre-launch · {coll} collateral</p>
          </div>
          <div className="text-right">
            <p className="num font-semibold leading-tight">{formatAmount(o.price)} {coll}</p>
            <p className="text-xs font-medium text-muted">per token</p>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex justify-between border-t border-line pt-2.5">
        <div>
          <p className="text-sm font-medium text-muted">Amount</p>
          <p className="num text-sm font-semibold text-accent">{formatAmount(o.tokenAmount)} {o.symbol}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted">Seller collateral</p>
          <p className="num text-sm font-semibold text-accent">{formatAmount(mulDecimal(o.tokenAmount, o.price))} {coll}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
        <div className="flex flex-col gap-0.5 text-xs text-muted">
          <span title={o.seller}>Seller {shortAddress(o.seller)}</span>
          <span className="flex items-center gap-3">
            <span className={preTge ? "font-semibold text-accent" : "font-semibold text-warn"}>
              {preTge ? `TGE in ${timeLeft(o.tge)}` : "TGE passed"}
            </span>
            {views > 0 && (
              <span className="flex items-center gap-1" title="Views">
                <span className="block h-4 w-4"><EyeGrayIcon /></span>
                <span className="num">{views}</span>
              </span>
            )}
            <ArkivBadge entityKey={o.key} />
          </span>
        </div>
        <Link to={`/premarket/${o.key}`} className="rounded-full bg-brand-gradient px-5 py-1.5 text-sm font-semibold text-accent-ink">
          {preTge ? "Buy" : "View"}
        </Link>
      </div>
    </li>
  );
}

export default function Premarket() {
  const [symbol, setSymbol] = useState("");
  const [search, setSearch] = useState("");
  const { byAddress, premarketLogos } = useTokens();
  const all = usePremarketOffers();
  const list = all.data ?? [];

  // Featured banners: the pre-launch tokens with the most live offers.
  const bySymbol = new Map();
  for (const o of list) {
    const s = bySymbol.get(o.symbol) ?? { symbol: o.symbol, offers: 0, tge: o.tge };
    s.offers += 1;
    bySymbol.set(o.symbol, s);
  }
  const featured = [...bySymbol.values()]
    .sort((a, b) => b.offers - a.offers)
    .map((f) => ({ ...f, logo: premarketLogos[f.symbol.toUpperCase()] }));

  const q = search.trim().toLowerCase();
  const offers = list.filter((o) => (!symbol || o.symbol === symbol) && (!q || o.symbol.toLowerCase().includes(q)));
  const viewCounts = useViewCounts(offers.map((o) => o.key.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Premarket"
        description="Buy tokens before they launch. Sellers lock 100% of the deal value as collateral in escrow on Arc; if they don't deliver the real tokens after TGE, buyers receive that collateral."
        actions={
          <Link to="/create?tab=premarket" className="rounded-full bg-brand-gradient px-5 py-2 text-sm font-semibold text-accent-ink">
            Create offer
          </Link>
        }
      />

      <TokenBanners items={featured} selected={symbol} onSelect={setSymbol} />

      <div className="mb-8">
        <MarketStats />
      </div>

      <SectionTitle>Live Deals</SectionTitle>
      <Panel
        toolbar={
          <>
            <div className="flex rounded-full border border-line bg-surface p-1">
              {["", ...featured.map((f) => f.symbol)].slice(0, 6).map((s) => (
                <button
                  key={s || "all"}
                  type="button"
                  onClick={() => setSymbol(s)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${symbol === s ? "bg-brand-gradient text-accent-ink" : "text-ink"}`}
                >
                  {s || "All"}
                </button>
              ))}
            </div>
            <label className="ml-auto flex h-11 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 sm:w-64">
              <span className="block h-4 w-4 text-muted"><SearchIcon /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                aria-label="Search by token"
              />
            </label>
          </>
        }
      >
        {all.isLoading ? (
          <EmptyState title="Loading premarket deals…" compact />
        ) : all.error ? (
          <EmptyState title="Couldn't load the premarket deals.">{all.error.message}</EmptyState>
        ) : offers.length === 0 ? (
          <EmptyState title="It seems there is no premarket deal yet.">
            <Link to="/create?tab=premarket" className="font-semibold text-accent hover:underline">Create the first offer</Link>
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => (
              <DealCard key={o.key} offer={o} coll={tokenLabel(byAddress, o.collateralToken)} views={viewCounts[o.key.toLowerCase()] ?? 0} logo={premarketLogos[o.symbol.toUpperCase()]} />
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
