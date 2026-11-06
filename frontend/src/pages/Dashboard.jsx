import { useState } from "react";
import { Link } from "react-router";
import { formatUnits } from "viem";
import { useAccount, useConfig, useReadContracts } from "wagmi";
import { switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { errorMessage } from "../components/TxSteps.jsx";
import { useMyFills, useMyOrders } from "../hooks/useMyActivity.js";
import { useTokens } from "../hooks/useTokens.js";
import { OTC_ABI } from "../contracts/otc.js";
import { arkivExplorer } from "../arkiv/client.js";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { arcExplorer, formatAmount, shortAddress } from "../lib/format.js";

const TABS = [
  { id: "orders", label: "My orders" },
  { id: "fills", label: "My fills" },
  { id: "balances", label: "Balances" },
];

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

function Balances({ address }) {
  const config = useConfig();
  const { tokens } = useTokens();
  const [status, setStatus] = useState({});
  const { data, refetch, isLoading } = useReadContracts({
    contracts: tokens.map((t) => ({
      chainId: arcTestnet.id, address: settings.arc.otc, abi: OTC_ABI, functionName: "balances", args: [address, t.address],
    })),
    query: { enabled: Boolean(settings.arc.otc && address) },
  });

  if (!settings.arc.otc) return <EmptyState title="The OTC contract isn't configured yet" />;
  if (isLoading) return <EmptyState title="Loading balances…" />;

  async function withdraw(token) {
    setStatus((s) => ({ ...s, [token]: "pending" }));
    try {
      await switchChain(config, { chainId: arcTestnet.id });
      const hash = await writeContract(config, {
        chainId: arcTestnet.id, address: settings.arc.otc, abi: OTC_ABI, functionName: "withdraw", args: [token],
      });
      await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
      setStatus((s) => ({ ...s, [token]: "done" }));
      refetch();
    } catch (err) {
      setStatus((s) => ({ ...s, [token]: errorMessage(err) }));
    }
  }

  const rows = tokens
    .map((t, i) => ({ ...t, amount: data?.[i]?.status === "success" ? data[i].result : 0n }))
    .filter((t) => t.amount > 0n);

  if (!rows.length) return <EmptyState title="Nothing to withdraw">Proceeds, refunds and broker fees appear here.</EmptyState>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {rows.map((t) => (
        <li key={t.address} className="flex items-center gap-4 px-4 py-3 text-sm">
          <span className="font-medium">{t.symbol}</span>
          <span className="num">{formatAmount(formatUnits(t.amount, t.decimals))}</span>
          <span className="ml-auto text-xs text-muted">{status[t.address] && status[t.address] !== "pending" && status[t.address]}</span>
          <button
            onClick={() => withdraw(t.address)}
            disabled={status[t.address] === "pending"}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50"
          >
            {status[t.address] === "pending" ? "Confirm…" : "Withdraw"}
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

  if (!isConnected) {
    return (
      <>
        <PageHeader title="Dashboard" description="Your orders, fills and withdrawable balances." />
        <EmptyState title="Connect a wallet to see your activity">
          <div className="mt-4 flex justify-center"><ConnectButton /></div>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your orders, fills and withdrawable balances."
        actions={<Link to="/create" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Create order</Link>}
      />
      <div className="mb-6 flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" &&
        (orders.isLoading ? (
          <EmptyState title="Loading your orders…" />
        ) : orders.error ? (
          <EmptyState title="Couldn't load your orders">{orders.error.message}</EmptyState>
        ) : orders.data.length ? (
          <OrderList orders={orders.data} byAddress={byAddress} />
        ) : (
          <EmptyState title="No live orders">
            Listings disappear from Arkiv at their deadline; refunds show under Balances.
          </EmptyState>
        ))}
      {tab === "fills" && <Fills address={address} />}
      {tab === "balances" && <Balances address={address} />}
    </>
  );
}
