import { useState } from "react";
import { Link, useParams } from "react-router";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { useAccount, useConfig, useReadContract } from "wagmi";
import { readContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ExpirationTime } from "@arkiv-network/sdk";
import { addr, dec, u64 } from "@arkiv-network/sdk/schema";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { Pill } from "../components/OrderList.jsx";
import { TxSteps, errorMessage, initSteps, updateStep } from "../components/TxSteps.jsx";
import { useArkivOrder, useOnchainOrder } from "../hooks/useOrder.js";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";
import { OTC_ABI, orientation } from "../contracts/otc.js";
import { Fill } from "../arkiv/schemas.js";
import { getArkivWallet } from "../arkiv/wallet.js";
import { arkivExplorer } from "../arkiv/client.js";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { arcExplorer, formatAmount, shortAddress, timeLeft } from "../lib/format.js";
import { isDecimal } from "../lib/amounts.js";

const ceilDiv = (a, b) => (a + b - 1n) / b;

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default function OtcDetails() {
  const { key } = useParams();
  const config = useConfig();
  const { address } = useAccount();
  const { byAddress } = useTokens();
  const listing = useArkivOrder(key);
  const order = listing.data;
  const chain = useOnchainOrder(order?.orderId);
  const onchain = chain.data;

  const { base, quote } = order ? orientation(order) : {};
  const decimals = (token) => ({
    chainId: arcTestnet.id, address: token, abi: erc20Abi, functionName: "decimals", query: { enabled: Boolean(token) },
  });
  const { data: baseDec } = useReadContract(decimals(base));
  const { data: quoteDec } = useReadContract(decimals(quote));

  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState(null);
  const [busy, setBusy] = useState(false);

  if (listing.isLoading) return <EmptyState title="Loading order…" />;
  if (listing.error) return <EmptyState title="Couldn't load the order">{listing.error.message}</EmptyState>;
  if (!order) {
    return (
      <EmptyState title="This listing is no longer on Arkiv">
        It expired at its deadline or was cancelled. <Link to="/otc" className="text-accent hover:underline">Back to the market</Link>
      </EmptyState>
    );
  }

  const b = tokenLabel(byAddress, base);
  const q = tokenLabel(byAddress, quote);
  const isMaker = address && address.toLowerCase() === order.maker.toLowerCase();
  const ownerMatches = onchain ? onchain.maker.toLowerCase() === order.owner.toLowerCase() : null;
  const remainingOffer = onchain ? onchain.offerAmount - onchain.filledOffer : null;
  const open = onchain && !onchain.cancelled && Number(onchain.deadline) > Date.now() / 1000 && remainingOffer > 0n;

  // Remaining amount in base units (offer side for sells, want side for buys).
  const remainingBase =
    onchain && remainingOffer !== null
      ? order.side === "sell"
        ? remainingOffer
        : (remainingOffer * onchain.wantAmount) / onchain.offerAmount
      : null;
  const remainingBaseText = remainingBase !== null && baseDec !== undefined ? formatUnits(remainingBase, baseDec) : null;
  const fillText = order.partial ? amount : remainingBaseText ?? "";

  async function fill(e) {
    e.preventDefault();
    if (busy || !onchain || baseDec === undefined || quoteDec === undefined) return;
    if (!isDecimal(fillText) || Number(fillText) <= 0) return;
    setBusy(true);
    let s = initSteps([
      { id: "approve", label: `Approve ${order.side === "sell" ? q : b}`, chain: "Arc" },
      { id: "fill", label: "Fill the order", chain: "Arc" },
      { id: "record", label: "Record the fill on Arkiv", chain: "Arkiv" },
    ]);
    const set = (id, patch) => setSteps((s = updateStep(s, id, patch)));
    setSteps(s);
    let step = "approve";
    try {
      await switchChain(config, { chainId: arcTestnet.id });
      const baseUnits = parseUnits(fillText, baseDec);
      if (baseUnits > remainingBase) throw new Error("Amount is more than what's left on this order");

      // offerAmount = how much of the maker's offered token the taker takes.
      // The taker pays the other token pro-rata (rounded up for the allowance).
      let offerAmount, payToken, payAmount;
      if (order.side === "sell") {
        offerAmount = baseUnits;
        payToken = onchain.wantToken;
        payAmount = ceilDiv(baseUnits * onchain.wantAmount, onchain.offerAmount);
      } else {
        offerAmount = (baseUnits * onchain.offerAmount) / onchain.wantAmount;
        payToken = onchain.wantToken;
        payAmount = baseUnits;
      }

      set("approve", { status: "active" });
      const allowance = await readContract(config, {
        chainId: arcTestnet.id, address: payToken, abi: erc20Abi, functionName: "allowance", args: [address, settings.arc.otc],
      });
      if (allowance < payAmount) {
        const hash = await writeContract(config, {
          chainId: arcTestnet.id, address: payToken, abi: erc20Abi, functionName: "approve", args: [settings.arc.otc, payAmount + 1n],
        });
        await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
        set("approve", { status: "done", link: arcExplorer.tx(hash) });
      } else {
        set("approve", { status: "skipped" });
      }

      step = "fill";
      set("fill", { status: "active" });
      const fillHash = await writeContract(config, {
        chainId: arcTestnet.id, address: settings.arc.otc, abi: OTC_ABI, functionName: "fill", args: [BigInt(order.orderId), offerAmount],
      });
      await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash: fillHash });
      set("fill", { status: "done", link: arcExplorer.tx(fillHash) });
      chain.refetch();

      // Read-only Arkiv record: an immutable, public track record of the trade.
      step = "record";
      set("record", { status: "active" });
      const arkiv = await getArkivWallet(config);
      const { txHash } = await arkiv.createEntity(
        Fill,
        {
          market: "otc",
          refId: u64(BigInt(order.orderId)),
          orderKey: order.key,
          taker: addr(address),
          maker: addr(order.maker),
          amount: dec(fillText),
          price: dec(order.price),
          arcTx: fillHash,
        },
        { expiration: ExpirationTime.fromDays(90), flags: { readonly: true } },
      );
      set("record", { status: "done", link: arkivExplorer.tx(txHash) });
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    } catch (err) {
      set(step, { status: "error", error: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy) return;
    setBusy(true);
    let s = initSteps([
      { id: "cancel", label: "Cancel and refund", chain: "Arc" },
      { id: "delete", label: "Remove the listing", chain: "Arkiv" },
    ]);
    const set = (id, patch) => setSteps((s = updateStep(s, id, patch)));
    setSteps(s);
    let step = "cancel";
    try {
      await switchChain(config, { chainId: arcTestnet.id });
      set("cancel", { status: "active" });
      const hash = await writeContract(config, {
        chainId: arcTestnet.id, address: settings.arc.otc, abi: OTC_ABI, functionName: "cancel", args: [BigInt(order.orderId)],
      });
      await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
      set("cancel", { status: "done", link: arcExplorer.tx(hash) });
      chain.refetch();

      step = "delete";
      set("delete", { status: "active" });
      const arkiv = await getArkivWallet(config);
      const { txHash } = await arkiv.deleteEntity({ entityKey: order.key });
      set("delete", { status: "done", link: arkivExplorer.tx(txHash) });
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    } catch (err) {
      set(step, { status: "error", error: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={`${order.side === "sell" ? "Selling" : "Buying"} ${b}`}
        description={`Order #${order.orderId.toString()} · priced in ${q}`}
        actions={<Link to="/otc" className="rounded-md border border-line px-3 py-2 text-sm">Back to market</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-xl border border-line bg-surface p-5">
          <Row label="Price"><span className="num">{formatAmount(order.price)} {q}</span> per {b}</Row>
          <Row label="Listed amount"><span className="num">{formatAmount(order.amount)} {b}</span></Row>
          <Row label="Remaining">
            {remainingBaseText !== null ? <span className="num">{formatAmount(remainingBaseText)} {b}</span> : <span className="text-muted">{settings.arc.otc ? "loading…" : "contract not configured"}</span>}
          </Row>
          <Row label="Lot">{order.partial ? "Partial fills allowed" : "Full amount only"}</Row>
          <Row label="Ends">{timeLeft(order.deadline)} · {new Date(order.deadline * 1000).toLocaleString()}</Row>
          <Row label="Maker"><span title={order.maker}>{order.makerEns || shortAddress(order.maker)}</span></Row>
          {order.brokerEns && <Row label="Broker"><span className="text-accent">{order.brokerEns}</span></Row>}
          <Row label="Escrow">
            <a href={arcExplorer.tx(order.arcTx)} target="_blank" rel="noreferrer" className="text-accent hover:underline">Arc transaction</a>
          </Row>
          <Row label="Listing">
            <a href={arkivExplorer.entity(order.key)} target="_blank" rel="noreferrer" className="text-accent hover:underline">Arkiv entity</a>
          </Row>
          <Row label="Verified">
            {ownerMatches === null ? <Pill>unchecked</Pill> : ownerMatches ? <Pill tone="accent">listing owner = on-chain maker</Pill> : <Pill tone="sell">owner mismatch</Pill>}
          </Row>
        </section>

        <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          {isMaker ? (
            <>
              <p className="text-sm text-muted">This is your order. Cancelling refunds the unfilled amount from escrow and removes the listing.</p>
              <button onClick={cancel} disabled={busy || !open} className="rounded-md border border-sell/50 px-4 py-2.5 text-sm font-semibold text-sell disabled:opacity-50">
                {busy ? "Confirm in your wallet…" : "Cancel order"}
              </button>
            </>
          ) : (
            <form onSubmit={fill} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Amount of {b} to {order.side === "sell" ? "buy" : "sell"}
                <input
                  inputMode="decimal"
                  value={fillText}
                  disabled={!order.partial}
                  onChange={(e) => setAmount(e.target.value.trim())}
                  placeholder={remainingBaseText ?? "0"}
                  className="num rounded-md border border-line bg-page px-3 py-2 text-sm disabled:opacity-70"
                />
              </label>
              {isDecimal(fillText) && Number(fillText) > 0 && (
                <p className="num text-sm text-muted">
                  {order.side === "sell" ? "You pay" : "You receive"} ≈ {formatAmount(Number(fillText) * Number(order.price))} {q}
                </p>
              )}
              <button
                type="submit"
                disabled={!address || busy || !open || !isDecimal(fillText) || Number(fillText) <= 0}
                className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
              >
                {!address ? "Connect a wallet" : busy ? "Confirm in your wallet…" : !open && onchain ? "Order closed" : order.side === "sell" ? `Buy ${b}` : `Sell ${b}`}
              </button>
            </form>
          )}
          {steps && <TxSteps steps={steps} />}
        </aside>
      </div>
    </>
  );
}
