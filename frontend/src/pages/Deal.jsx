import { useState } from "react";
import { Link, useParams } from "react-router";
import { useAccount, useConfig } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { NoEntityFoundError } from "@arkiv-network/sdk";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { BrokerBadge } from "../components/BrokerBadge.jsx";
import { TxSteps, errorMessage, initSteps, updateStep } from "../components/TxSteps.jsx";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";
import { isLicensedFor, useBrokerLicense } from "../hooks/useBroker.js";
import { BrokerLink } from "../arkiv/schemas.js";
import { arkivPublic, arkivExplorer } from "../arkiv/client.js";
import { CREATE_STEPS, createOtcOrder } from "../lib/otcActions.js";
import { formatAmount, shortAddress } from "../lib/format.js";
import { mulDecimal } from "../lib/amounts.js";
import { settings } from "../config/env.js";

const BLOCK_SECONDS = 2;
const DEAL_HOURS = 24;

function useDealLink(key) {
  return useQuery({
    queryKey: ["deal", key],
    refetchInterval: 15_000,
    queryFn: async () => {
      try {
        const [e, block] = await Promise.all([arkivPublic.getEntity(key, BrokerLink), arkivPublic.getBlockNumber()]);
        return {
          broker: e.broker.value,
          client: e.client.value,
          brokerEns: e.brokerEns.value,
          offerToken: e.offerToken.value,
          wantToken: e.wantToken.value,
          price: e.price.value,
          amount: e.amount.value,
          feeBps: Number(e.feeBps.value),
          secondsLeft: Number(e.$expiresAt - block) * BLOCK_SECONDS,
        };
      } catch (err) {
        if (err instanceof NoEntityFoundError) return null;
        throw err;
      }
    },
  });
}

export default function Deal() {
  const { key } = useParams();
  const config = useConfig();
  const { address } = useAccount();
  const { byAddress } = useTokens();
  const { data: deal, isLoading, error } = useDealLink(key);
  const license = useBrokerLicense(deal?.brokerEns);
  const [steps, setSteps] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <EmptyState title="Loading deal…" />;
  if (error) return <EmptyState title="Couldn't load the deal">{error.message}</EmptyState>;
  if (!deal) {
    return (
      <EmptyState title="This deal link has expired">
        Broker links live on Arkiv for 10 minutes so a deal can't be approved at a stale price. Ask your broker for a new link.
      </EmptyState>
    );
  }

  const sells = tokenLabel(byAddress, deal.offerToken);
  const gets = tokenLabel(byAddress, deal.wantToken);
  const licensed = isLicensedFor(license.data, deal.broker);
  const isClient = address && address.toLowerCase() === deal.client.toLowerCase();
  const total = mulDecimal(deal.amount, deal.price);
  const fee = Number(total) * (deal.feeBps / 10_000);

  async function approve() {
    if (busy || !licensed || !isClient) return;
    setBusy(true);
    let s = initSteps(CREATE_STEPS);
    const set = (id, patch) => setSteps((s = updateStep(s, id, patch)));
    setSteps(s);
    try {
      const created = await createOtcOrder(
        config,
        {
          maker: address,
          side: "sell",
          base: deal.offerToken,
          quote: deal.wantToken,
          amount: deal.amount,
          price: deal.price,
          partial: true,
          deadline: Math.floor(Date.now() / 1000) + DEAL_HOURS * 3600,
          broker: deal.broker,
          brokerFeeBps: deal.feeBps,
          brokerEns: deal.brokerEns,
        },
        set,
      );
      setResult(created);
    } catch (err) {
      set(err.step ?? "approve", { status: "error", error: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Broker deal" description="Review the deal your broker prepared. Approving locks your tokens in escrow on Arc and lists the order for 24 hours." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Broker</span>
            <BrokerBadge name={deal.brokerEns} address={deal.broker} size="md" />
          </div>
          <div className="flex justify-between"><span className="text-muted">You sell</span><span className="num">{formatAmount(deal.amount)} {sells}</span></div>
          <div className="flex justify-between"><span className="text-muted">Price</span><span className="num">{formatAmount(deal.price)} {gets} per {sells}</span></div>
          <div className="flex justify-between"><span className="text-muted">You receive (before fee)</span><span className="num">{formatAmount(total)} {gets}</span></div>
          <div className="flex justify-between"><span className="text-muted">Broker fee</span><span className="num">{deal.feeBps} bps ≈ {formatAmount(fee)} {gets}</span></div>
          <div className="flex justify-between"><span className="text-muted">Client</span><span title={deal.client}>{shortAddress(deal.client)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Link expires</span><span className="num">{deal.secondsLeft > 0 ? `in ~${Math.ceil(deal.secondsLeft / 60)} min` : "now"}</span></div>
          <a href={arkivExplorer.entity(key)} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-accent">📦 Deal link on Arkiv</a>
        </section>

        <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          {!licensed && !license.isLoading && (
            <p className="rounded-md border border-sell/40 bg-sell/10 px-3 py-2 text-sm text-sell">
              The broker's ENS license isn't valid, so this deal can't be approved.
            </p>
          )}
          {address && !isClient && <p className="text-sm text-warn">This link was made for {shortAddress(deal.client)}. Connect that wallet to approve.</p>}
          {steps && <TxSteps steps={steps} />}
          {result ? (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-accent">Order #{result.orderId} is live.</p>
              <Link to={`/otc/${result.entityKey}`} className="text-accent hover:underline">Open the order</Link>
            </div>
          ) : (
            <button
              onClick={approve}
              disabled={!address || !isClient || !licensed || busy || !settings.arc.otc}
              className="rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
            >
              {!address ? "Connect a wallet" : !licensed ? "Broker not verified" : busy ? "Confirm in your wallet…" : "Approve deal"}
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
