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
import { PremarketActions } from "../components/PremarketActions.jsx";
import { useMarket, useOnchainOffer, usePremarketListing, usePurchase } from "../hooks/usePremarket.js";
import { useTokens, tokenLabel } from "../hooks/useTokens.js";
import { useRecordView } from "../hooks/useViews.js";
import { OFFER_STATUS, PREMARKET_ABI, PRE_TOKEN_DECIMALS, collateralFor, marketPhase, minFirstPurchase } from "../contracts/premarket.js";
import { Fill } from "../arkiv/schemas.js";
import { getArkivWallet } from "../arkiv/wallet.js";
import { arkivExplorer } from "../arkiv/client.js";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { arcExplorer, formatAmount, shortAddress, timeLeft } from "../lib/format.js";
import { isDecimal } from "../lib/amounts.js";
import { switchAndWait } from "../lib/chain.js";

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

const PHASE_TEXT = {
  "pre-tge": "Before TGE: buying open",
  delivery: "Delivery window: seller must deliver",
  settled: "Settled or in default",
  unknown: "–",
};

export default function PremarketDetails() {
  const { key } = useParams();
  const config = useConfig();
  const { address } = useAccount();
  const { byAddress } = useTokens();
  const listing = usePremarketListing(key);
  const views = useRecordView(key);
  const offerQ = useOnchainOffer(listing.data?.offerId);
  const offer = offerQ.data;
  const marketQ = useMarket(listing.data?.marketId);
  const market = marketQ.data;
  const purchase = usePurchase(listing.data?.offerId, address);
  const { data: collDec } = useReadContract({
    chainId: arcTestnet.id, address: listing.data?.collateralToken, abi: erc20Abi, functionName: "decimals",
    query: { enabled: Boolean(listing.data) },
  });

  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState(null);
  const [retry, setRetry] = useState(null);
  const [busy, setBusy] = useState(false);

  if (listing.isLoading) return <EmptyState title="Loading offer…" />;
  if (listing.error) return <EmptyState title="Couldn't load the offer">{listing.error.message}</EmptyState>;
  const o = listing.data;
  if (!o) {
    return (
      <EmptyState title="This offer is no longer on Arkiv">
        Its listing expired after the delivery window or was cancelled. Your positions stay in the escrow contract.{" "}
        <Link to="/" className="text-accent hover:underline">Back to Premarket</Link>
      </EmptyState>
    );
  }

  const coll = tokenLabel(byAddress, o.collateralToken);
  const phase = marketPhase(market);
  const available = offer ? offer.tokenAmount - offer.sold : null;
  const isSeller = address && address.toLowerCase() === o.seller.toLowerCase();
  const canBuy = offer && offer.status === 0 && phase === "pre-tge" && available > 0n && !isSeller;

  async function buy(e) {
    e.preventDefault();
    if (busy || !canBuy || !isDecimal(amount) || Number(amount) <= 0) return;
    setBusy(true);
    let s = initSteps([
      { id: "approve", label: `Approve ${coll}`, chain: "Arc" },
      { id: "buy", label: "Buy into escrow", chain: "Arc" },
      { id: "record", label: "Record the purchase on Arkiv", chain: "Arkiv" },
    ]);
    const set = (id, patch) => setSteps((s = updateStep(s, id, patch)));
    setSteps(s);
    setRetry(null);
    let step = "approve";
    let arkivStep = null;
    try {
      await switchAndWait(config, arcTestnet.id);
      const tokenAmount = parseUnits(amount, PRE_TOKEN_DECIMALS);
      if (tokenAmount > available) throw new Error("More than what's available on this offer");
      const pay = collateralFor(tokenAmount, offer.pricePerToken);

      set("approve", { status: "active" });
      const allowance = await readContract(config, {
        chainId: arcTestnet.id, address: o.collateralToken, abi: erc20Abi, functionName: "allowance", args: [address, settings.arc.premarket],
      });
      if (allowance < pay) {
        const hash = await writeContract(config, {
          chainId: arcTestnet.id, address: o.collateralToken, abi: erc20Abi, functionName: "approve", args: [settings.arc.premarket, pay],
        });
        await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
        set("approve", { status: "done", link: arcExplorer.tx(hash) });
      } else {
        set("approve", { status: "skipped" });
      }

      step = "buy";
      set("buy", { status: "active" });
      const buyHash = await writeContract(config, {
        chainId: arcTestnet.id, address: settings.arc.premarket, abi: PREMARKET_ABI, functionName: "buy", args: [BigInt(o.offerId), tokenAmount],
      });
      await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash: buyHash });
      set("buy", { status: "done", link: arcExplorer.tx(buyHash) });
      offerQ.refetch();
      purchase.refetch();

      step = "record";
      arkivStep = async () => {
      set("record", { status: "active" });
      const arkiv = await getArkivWallet(config);
      const { txHash } = await arkiv.createEntity(
        Fill,
        {
          market: "premarket",
          refId: u64(BigInt(o.offerId)),
          orderKey: o.key,
          symbol: o.symbol,
          quoteToken: addr(o.collateralToken),
          taker: addr(address),
          maker: addr(o.seller),
          amount: dec(amount),
          price: dec(o.price),
          arcTx: buyHash,
        },
        { expiration: ExpirationTime.fromDays(90), flags: { readonly: true } },
      );
      set("record", { status: "done", link: arkivExplorer.tx(txHash) });
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
      };
      await arkivStep();
    } catch (err) {
      set(step, { status: "error", error: errorMessage(err) });
      if (step === "record" && arkivStep) {
        const again = arkivStep;
        setRetry(() => async () => {
          setBusy(true);
          try {
            await again();
            setRetry(null);
          } catch (e) {
            set("record", { status: "error", error: errorMessage(e) });
          } finally {
            setBusy(false);
          }
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const pre = (units) => formatAmount(formatUnits(units, PRE_TOKEN_DECIMALS));
  const collText = (units) => (collDec !== undefined ? formatAmount(formatUnits(units, collDec)) : "…");

  return (
    <>
      <PageHeader
        title={`${o.symbol} premarket`}
        description={`Offer #${o.offerId} · priced in ${coll}`}
        actions={<Link to="/" className="rounded-full border border-line px-3 py-2 text-sm">Back to Premarket</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-xl border border-line bg-surface p-5">
          <Row label="Phase"><Pill tone={phase === "pre-tge" ? "accent" : "warn"}>{PHASE_TEXT[phase]}</Pill></Row>
          <Row label="TGE">{market ? `${new Date(Number(market.tge) * 1000).toLocaleString()} (${timeLeft(Number(market.tge))})` : timeLeft(o.tge)}</Row>
          {market && <Row label="Delivery window">{Math.round(Number(market.deliveryWindow) / 60)} minutes after TGE</Row>}
          <Row label="Price"><span className="num">{formatAmount(o.price)} {coll}</span> per {o.symbol}</Row>
          <Row label="Offered">{offer ? <span className="num">{pre(offer.tokenAmount)} {o.symbol}</span> : <span className="num">{formatAmount(o.tokenAmount)} {o.symbol}</span>}</Row>
          <Row label="Available">{available !== null ? <span className="num">{pre(available)} {o.symbol}</span> : <span className="text-muted">{settings.arc.premarket ? "loading…" : "contract not configured"}</span>}</Row>
          {offer && <Row label="Seller collateral"><span className="num">{collText(offer.sellerCollateral)} {coll}</span></Row>}
          {offer && <Row label="Status">{OFFER_STATUS[offer.status] ?? offer.status}</Row>}
          <Row label="Seller"><span title={o.seller}>{shortAddress(o.seller)}</span></Row>
          {purchase.data > 0n && <Row label="Your purchase"><span className="num text-accent">{pre(purchase.data)} {o.symbol}</span></Row>}
          <Row label="Escrow"><a href={arcExplorer.tx(o.arcTx)} target="_blank" rel="noreferrer" className="text-accent hover:underline">Arc transaction</a></Row>
          {views !== null && <Row label="Views"><span className="num">👁 {views}</span></Row>}
          <Row label="Listing"><a href={arkivExplorer.entity(o.key)} target="_blank" rel="noreferrer" className="text-accent hover:underline">Arkiv entity</a></Row>
        </section>

        <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          {canBuy ? (
            <form onSubmit={buy} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Amount of {o.symbol} to buy
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} placeholder={pre(available)} className="num rounded-md border border-line bg-page px-3 py-2 text-sm" />
              </label>
              {isDecimal(amount) && Number(amount) > 0 && offer && (
                <p className="num text-sm text-muted">
                  You pay {collText(collateralFor(parseUnits(amount, PRE_TOKEN_DECIMALS), offer.pricePerToken))} {coll}
                </p>
              )}
              {offer && !(purchase.data > 0n) && (
                // The contract requires a new buyer's first purchase to be at least
                // 1/50 of the offer, or everything that's left (MAX_BUYERS = 50).
                <p className="text-xs text-muted">
                  Minimum first purchase:{" "}
                  <span className="num">{pre(minFirstPurchase(offer.tokenAmount, available))} {o.symbol}</span>
                </p>
              )}
              <button type="submit" disabled={!address || busy} className="rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50">
                {!address ? "Connect a wallet" : busy ? "Confirm in your wallet…" : `Buy ${o.symbol}`}
              </button>
              <p className="text-xs text-muted">If the seller doesn't deliver within the window after TGE, you can claim your payment back plus your share of the seller's collateral.</p>
            </form>
          ) : (
            <PremarketActions listing={o} offer={offer} market={market} phase={phase} isSeller={isSeller} purchase={purchase.data} onDone={() => (offerQ.refetch(), purchase.refetch())} />
          )}
          {steps && <TxSteps steps={steps} onRetry={retry} busy={busy} />}
        </aside>
      </div>
    </>
  );
}
