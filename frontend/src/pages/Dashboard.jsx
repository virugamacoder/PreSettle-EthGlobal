import { useState } from "react";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { useAccount, useConfig, useReadContracts } from "wagmi";
import { switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { PageHeader, EmptyState, Panel, PillTabs } from "../components/PageHeader.jsx";
import { WalletButton } from "../components/Header.jsx";
import { DashboardSidebar } from "../components/DashboardSidebar.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { errorMessage } from "../components/TxSteps.jsx";
import { useMyFills, useMyOrders } from "../hooks/useMyActivity.js";
import { useTokens } from "../hooks/useTokens.js";
import { OTC_ABI } from "../contracts/otc.js";
import { PREMARKET_ABI } from "../contracts/premarket.js";
import { useMarkets, useMyPremarketOffers } from "../hooks/usePremarket.js";
import { Link } from "react-router";
import { formatAmount as fmt, timeLeft } from "../lib/format.js";
import { arkivExplorer } from "../arkiv/client.js";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { arcExplorer, formatAmount, shortAddress } from "../lib/format.js";

const TABS = [
  { id: "orders", label: "My orders" },
  { id: "fills", label: "My fills" },
  { id: "balances", label: "Balances" },
];

// Premarket offers this wallet listed (the old dashboard's "My Created Deals").
function MyPremarketOffers({ address, byAddress }) {
  const { data, isLoading } = useMyPremarketOffers(address);
  if (isLoading || !data?.length) return null;
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold">My premarket offers</h3>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {data.map((o) => (
          <li key={o.key} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-sm">
            <span className="font-medium">{o.symbol}</span>
            <span className="num">{fmt(o.tokenAmount)} @ {fmt(o.price)} {byAddress[o.collateralToken?.toLowerCase()]?.symbol ?? ""}</span>
            <span className="text-muted">{o.tge > Date.now() / 1000 ? `TGE in ${timeLeft(o.tge)}` : "TGE passed"}</span>
            <Link to={`/premarket/${o.key}`} className="ml-auto text-accent hover:underline">Open</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fills({ address }) {
  const { data, isLoading, error } = useMyFills(address);
  if (isLoading) return <EmptyState title="Loading fills…" />;
  if (error) return <EmptyState title="Couldn't load fills">{error.message}</EmptyState>;
  if (!data.length) return <EmptyState title="No fills yet">Fills you take are recorded on Arkiv as read-only entities.</EmptyState>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {data.map((f) => (
        <li key={f.key} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-sm">
          <span className="font-medium">{f.market.toUpperCase()} #{f.refId}</span>
          <span className="num">{formatAmount(f.amount)} @ {formatAmount(f.price)}</span>
          <span className="text-muted">maker {shortAddress(f.maker)}</span>
          <span className="ml-auto flex gap-4 text-xs">
            <a href={arcExplorer.tx(f.arcTx)} target="_blank" rel="noreferrer" className="text-accent hover:underline">Arc tx</a>
            <a href={arkivExplorer.entity(f.key)} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">Arkiv record</a>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Both escrow contracts credit payouts (proceeds, refunds, delivered tokens,
// fees) to balances(account, token); the owner withdraws them per token.
const ESCROWS = [
  { name: "OTC", address: settings.arc.otc, abi: OTC_ABI },
  { name: "Premarket", address: settings.arc.premarket, abi: PREMARKET_ABI },
].filter((e) => e.address);

function Balances({ address }) {
  const config = useConfig();
  const { tokens } = useTokens();
  const { markets } = useMarkets();
  const [status, setStatus] = useState({});

  // Premarket real tokens may not be on the curated list yet: add them with their decimals.
  const known = new Set(tokens.map((t) => t.address.toLowerCase()));
  const extra = markets.filter((m) => m.realToken && m.realToken !== zeroAddress && !known.has(m.realToken.toLowerCase()));
  const extraDecimals = useReadContracts({
    contracts: extra.map((m) => ({ chainId: arcTestnet.id, address: m.realToken, abi: erc20Abi, functionName: "decimals" })),
    query: { enabled: extra.length > 0 },
  });
  const allTokens = [
    ...tokens,
    ...extra.map((m, i) => ({ address: m.realToken, symbol: m.symbol, decimals: Number(extraDecimals.data?.[i]?.result ?? 18) })),
  ];

  const pairs = ESCROWS.flatMap((escrow) => allTokens.map((token) => ({ escrow, token })));
  const { data, refetch, isLoading } = useReadContracts({
    contracts: pairs.map(({ escrow, token }) => ({
      chainId: arcTestnet.id, address: escrow.address, abi: escrow.abi, functionName: "balances", args: [address, token.address],
    })),
    query: { enabled: Boolean(address && pairs.length) },
  });

  if (!ESCROWS.length) return <EmptyState title="The escrow contracts aren't configured yet" />;
  if (isLoading) return <EmptyState title="Loading balances…" />;

  async function withdraw({ escrow, token }) {
    const id = escrow.name + token.address;
    setStatus((s) => ({ ...s, [id]: "pending" }));
    try {
      await switchChain(config, { chainId: arcTestnet.id });
      const hash = await writeContract(config, {
        chainId: arcTestnet.id, address: escrow.address, abi: escrow.abi, functionName: "withdraw", args: [token.address],
      });
      await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
      setStatus((s) => ({ ...s, [id]: "done" }));
      refetch();
    } catch (err) {
      setStatus((s) => ({ ...s, [id]: errorMessage(err) }));
    }
  }

  const rows = pairs
    .map((p, i) => ({ ...p, id: p.escrow.name + p.token.address, amount: data?.[i]?.status === "success" ? data[i].result : 0n }))
    .filter((r) => r.amount > 0n);

  if (!rows.length) {
    return (
      <EmptyState title="Nothing to withdraw">
        Proceeds, refunds, delivered premarket tokens and broker fees are credited here first. You withdraw them to your wallet.
      </EmptyState>
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-4 px-4 py-3 text-sm">
          <span className="font-medium">{r.token.symbol}</span>
          <span className="num">{formatAmount(formatUnits(r.amount, r.token.decimals))}</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{r.escrow.name}</span>
          <span className="ml-auto text-xs text-muted">{status[r.id] && status[r.id] !== "pending" && status[r.id]}</span>
          <button
            onClick={() => withdraw(r)}
            disabled={status[r.id] === "pending"}
            className="rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50"
          >
            {status[r.id] === "pending" ? "Confirm…" : "Withdraw"}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState("orders");
  const { byAddress } = useTokens();
  const orders = useMyOrders(address);
  const fills = useMyFills(address);

  if (!isConnected) {
    return (
      <>
        <PageHeader title="Dashboard" description="Your orders, fills and withdrawable balances." />
        <Panel>
          <EmptyState title="Connect a wallet to see your activity">
            <div className="mt-4 flex justify-center"><WalletButton /></div>
          </EmptyState>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Your orders, fills and withdrawable balances." />
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0">
          <div className="mb-5">
            <PillTabs tabs={TABS.map((t) => ({ value: t.id, label: t.label }))} value={tab} onChange={setTab} label="Dashboard sections" />
          </div>
          {tab === "orders" &&
            (orders.isLoading ? (
              <EmptyState title="Loading your orders…" compact />
            ) : orders.error ? (
              <EmptyState title="Couldn't load your orders">{orders.error.message}</EmptyState>
            ) : orders.data.length ? (
              <OrderList orders={orders.data} byAddress={byAddress} />
            ) : (
              <EmptyState title="It seems you have no live orders.">
                Listings disappear from Arkiv at their deadline; refunds show under Balances.
              </EmptyState>
            ))}
          {tab === "orders" && <MyPremarketOffers address={address} byAddress={byAddress} />}
          {tab === "fills" && <Fills address={address} />}
          {tab === "balances" && <Balances address={address} />}
        </div>
        <DashboardSidebar orders={orders.data ?? []} fills={fills.data ?? []} />
      </div>
    </>
  );
}
