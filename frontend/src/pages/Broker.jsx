import { useState } from "react";
import { Link } from "react-router";
import { isAddress } from "viem";
import { normalize } from "viem/ens";
import { useAccount, useConfig, useEnsAddress } from "wagmi";
import { switchChain } from "wagmi/actions";
import { useQuery } from "@tanstack/react-query";
import { ExpirationTime } from "@arkiv-network/sdk";
import { asc } from "@arkiv-network/sdk/query";
import { addr, dec, u64 } from "@arkiv-network/sdk/schema";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { BrokerBadge } from "../components/BrokerBadge.jsx";
import { TxSteps, errorMessage, initSteps, updateStep } from "../components/TxSteps.jsx";
import { useOrders } from "../hooks/useOrders.js";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";
import { brokerLabel, brokerName, isLicensedFor, useBrokerLicense } from "../hooks/useBroker.js";
import { BrokerLink } from "../arkiv/schemas.js";
import { arkivPublic, arkivExplorer } from "../arkiv/client.js";
import { getArkivWallet } from "../arkiv/wallet.js";
import { arcTestnet, sepolia } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { formatAmount, shortAddress } from "../lib/format.js";
import { isDecimal } from "../lib/amounts.js";

const field = "rounded-md border border-line bg-page px-3 py-2 text-sm text-ink";
const LINK_MINUTES = 10;

function useEnsInput(value) {
  const looksLikeName = value.includes(".") && !isAddress(value);
  let name;
  try {
    name = looksLikeName ? normalize(value) : undefined;
  } catch {
    name = undefined;
  }
  const { data, isLoading } = useEnsAddress({ name, chainId: sepolia.id, query: { enabled: Boolean(name) } });
  return { address: isAddress(value) ? value : data ?? null, resolving: isLoading && Boolean(name), isName: looksLikeName };
}

function CreateLinkForm() {
  const config = useConfig();
  const { address } = useAccount();
  const { tokens } = useTokens();
  const [label, setLabel] = useState("");
  const [client, setClient] = useState("");
  const [offerToken, setOfferToken] = useState("");
  const [wantToken, setWantToken] = useState(settings.arc.usdc);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [feeBps, setFeeBps] = useState("100");
  const [steps, setSteps] = useState(null);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);

  const license = useBrokerLicense(label);
  const licensed = isLicensedFor(license.data, address);
  const clientInput = useEnsInput(client.trim());
  const maxFee = license.data?.maxFeeBps ?? 0;
  const valid =
    licensed && clientInput.address && isAddress(offerToken) && offerToken !== wantToken &&
    isDecimal(amount) && Number(amount) > 0 && isDecimal(price) && Number(price) > 0 &&
    /^\d+$/.test(feeBps) && Number(feeBps) <= maxFee;

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setLink(null);
    let s = initSteps([{ id: "publish", label: `Publish a ${LINK_MINUTES}-minute deal link`, chain: "Arkiv" }]);
    const set = (id, patch) => setSteps((s = updateStep(s, id, patch)));
    setSteps(s);
    try {
      set("publish", { status: "active" });
      const arkiv = await getArkivWallet(config);
      const { entityKey, txHash } = await arkiv.createEntity(
        BrokerLink,
        {
          broker: addr(address),
          client: addr(clientInput.address),
          brokerEns: brokerName(brokerLabel(label)),
          offerToken: addr(offerToken),
          wantToken: addr(wantToken),
          price: dec(price),
          amount: dec(amount),
          feeBps: u64(BigInt(feeBps)),
        },
        { expiration: ExpirationTime.fromMinutes(LINK_MINUTES) },
      );
      set("publish", { status: "done", link: arkivExplorer.tx(txHash) });
      setLink(`${window.location.origin}/deal/${entityKey}`);
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    } catch (err) {
      set("publish", { status: "error", error: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <label className="flex flex-col gap-1 text-sm">
          Your broker name
          <div className="flex items-center gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value.trim())} placeholder="ravi" className={`${field} flex-1`} />
            <span className="text-sm text-muted">.{settings.ens.parentName}</span>
          </div>
          {brokerLabel(label) && <BrokerBadge name={brokerName(brokerLabel(label))} address={address} />}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Client wallet or ENS name
          <input value={client} onChange={(e) => setClient(e.target.value.trim())} placeholder="0x… or client.eth" className={`${field} num`} />
          <span className="text-xs text-muted">
            {clientInput.resolving ? "Resolving…" : clientInput.isName ? (clientInput.address ? `→ ${shortAddress(clientInput.address)}` : "Name not found") : ""}
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Client sells
            <select value={offerToken} onChange={(e) => setOfferToken(e.target.value)} className={field}>
              <option value="">Select a token</option>
              {tokens.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Amount
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} placeholder="1000" className={`${field} num`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Price, in
            <div className="flex gap-2">
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.trim())} placeholder="0.05" className={`${field} num min-w-0 flex-1`} />
              <select value={wantToken} onChange={(e) => setWantToken(e.target.value)} className={field}>
                {tokens.filter((t) => t.kind === "collateral").map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
              </select>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Broker fee (bps)
            <input inputMode="numeric" value={feeBps} onChange={(e) => setFeeBps(e.target.value.trim())} className={`${field} num`} />
            <span className="text-xs text-muted">Your license allows up to {maxFee} bps ({maxFee / 100}%).</span>
          </label>
        </div>
      </div>
      <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">
          The link is an Arkiv entity owned by you that <strong>disappears after {LINK_MINUTES} minutes</strong>, so a client can't approve a stale price.
        </p>
        {steps && <TxSteps steps={steps} />}
        {link ? (
          <div className="flex flex-col gap-2">
            <input readOnly value={link} className={`${field} num text-xs`} onFocus={(e) => e.target.select()} />
            <button type="button" onClick={() => navigator.clipboard?.writeText(link)} className="rounded-full border border-line px-3 py-2 text-sm">Copy link</button>
          </div>
        ) : (
          <button type="submit" disabled={!address || !valid || busy} className="rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50">
            {!address ? "Connect a wallet" : !licensed ? "Verified broker license required" : busy ? "Confirm in your wallet…" : "Create deal link"}
          </button>
        )}
      </aside>
    </form>
  );
}

function MyLinks() {
  const { address } = useAccount();
  const { byAddress } = useTokens();
  const { data, isLoading } = useQuery({
    queryKey: ["my-links", address],
    enabled: Boolean(address),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { entities } = await arkivPublic.select("*").from(BrokerLink).ownedBy(address).orderBy(asc("$key")).limit(50).fetch();
      return entities;
    },
  });
  if (!address || isLoading) return null;
  if (!data?.length) return <p className="text-sm text-muted">No active deal links. Links expire after {LINK_MINUTES} minutes.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {data.map((e) => (
        <li key={e.$key} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-sm">
          <span className="num">{formatAmount(e.amount.value)} {tokenLabel(byAddress, e.offerToken.value)} @ {formatAmount(e.price.value)} {tokenLabel(byAddress, e.wantToken.value)}</span>
          <span className="text-muted">client {shortAddress(e.client.value)}</span>
          <Link to={`/deal/${e.$key}`} className="ml-auto text-accent hover:underline">Open link</Link>
        </li>
      ))}
    </ul>
  );
}

export default function Broker() {
  const { byAddress } = useTokens();
  const { data, isLoading } = useOrders({});
  const brokerOrders = (data?.pages.flatMap((p) => p.orders) ?? []).filter((o) => o.brokerEns);

  return (
    <>
      <PageHeader title="Broker deals" description={`Deals arranged by brokers with a verified ENSv2 license (name.${settings.ens.parentName}). Licenses are non-transferable, expire, and can be revoked.`} />

      <h2 className="mb-3 text-lg font-semibold">On the market</h2>
      {isLoading ? <EmptyState title="Loading…" /> : brokerOrders.length ? <OrderList orders={brokerOrders} byAddress={byAddress} /> : <EmptyState title="No broker deals live right now" />}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Create a deal link for a client</h2>
      <CreateLinkForm />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Your active links</h2>
      <MyLinks />
    </>
  );
}
