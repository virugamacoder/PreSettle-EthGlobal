import { useState } from "react";
import { erc20Abi } from "viem";
import { useAccount, useConfig } from "wagmi";
import { readContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { OFFER_STATUS, PREMARKET_ABI, PRE_TOKEN_DECIMALS } from "../contracts/premarket.js";
import { getArkivWallet } from "../arkiv/wallet.js";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { arcExplorer } from "../lib/format.js";
import { TxSteps, errorMessage, initSteps, updateStep } from "./TxSteps.jsx";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * What the seller or a buyer can do with an offer that's no longer open for buying:
 * seller: cancel (nothing sold, before TGE), deliver (delivery window), reclaim unsold (after TGE)
 * buyer:  claim default (after the window, if not delivered)
 */
export function PremarketActions({ listing, offer, market, phase, isSeller, purchase, onDone }) {
  const config = useConfig();
  const { address } = useAccount();
  const [steps, setSteps] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!offer) return <p className="text-sm text-muted">Waiting for the escrow contract…</p>;
  const open = offer.status === 0;
  const unsold = offer.tokenAmount - offer.sold;

  async function run(defs, fn) {
    if (busy) return;
    setBusy(true);
    let s = initSteps(defs);
    const set = (id, patch) => setSteps((s = updateStep(s, id, patch)));
    setSteps(s);
    try {
      await switchChain(config, { chainId: arcTestnet.id });
      await fn(set);
      onDone?.();
    } catch (err) {
      const active = s.find((x) => x.status === "active") ?? s[0];
      set(active.id, { status: "error", error: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const call = async (set, id, functionName) => {
    set(id, { status: "active" });
    const hash = await writeContract(config, {
      chainId: arcTestnet.id, address: settings.arc.premarket, abi: PREMARKET_ABI, functionName, args: [BigInt(listing.offerId)],
    });
    await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
    set(id, { status: "done", link: arcExplorer.tx(hash) });
  };

  const cancel = () =>
    run(
      [{ id: "cancel", label: "Cancel and unlock collateral", chain: "Arc" }, { id: "delete", label: "Remove the listing", chain: "Arkiv" }],
      async (set) => {
        await call(set, "cancel", "cancelOffer");
        set("delete", { status: "active" });
        const arkiv = await getArkivWallet(config);
        await arkiv.deleteEntity({ entityKey: listing.key });
        set("delete", { status: "done" });
        await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
      },
    );

  // Seller sends the real tokens for everything sold. The real token may not
  // use 18 decimals, so the approval is scaled from the 18-dec sold amount.
  const deliver = () =>
    run(
      [{ id: "approve", label: "Approve the real token", chain: "Arc" }, { id: "deliver", label: "Deliver to buyers", chain: "Arc" }],
      async (set) => {
        set("approve", { status: "active" });
        const decimals = await readContract(config, { chainId: arcTestnet.id, address: market.realToken, abi: erc20Abi, functionName: "decimals" });
        const needed = (offer.sold * 10n ** BigInt(decimals) + 10n ** BigInt(PRE_TOKEN_DECIMALS) - 1n) / 10n ** BigInt(PRE_TOKEN_DECIMALS);
        const hash = await writeContract(config, {
          chainId: arcTestnet.id, address: market.realToken, abi: erc20Abi, functionName: "approve", args: [settings.arc.premarket, needed],
        });
        await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
        set("approve", { status: "done", link: arcExplorer.tx(hash) });
        await call(set, "deliver", "deliver");
      },
    );

  const reclaim = () => run([{ id: "reclaim", label: "Reclaim collateral for the unsold part", chain: "Arc" }], (set) => call(set, "reclaim", "reclaimUnsold"));
  const claimDefault = () => run([{ id: "claim", label: "Claim payment + seller collateral", chain: "Arc" }], (set) => call(set, "claim", "claimDefault"));

  const button = "rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50";
  let content;

  if (!open) {
    content = <p className="text-sm text-muted">This offer is {OFFER_STATUS[offer.status]?.toLowerCase()}.</p>;
  } else if (isSeller) {
    content = (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">This is your offer.</p>
        {phase === "pre-tge" && offer.sold === 0n && (
          <button onClick={cancel} disabled={busy} className={`${button} border border-sell/50 text-sell`}>Cancel offer</button>
        )}
        {phase === "delivery" && offer.sold > 0n && (
          market?.realToken && market.realToken !== ZERO ? (
            <button onClick={deliver} disabled={busy} className={`${button} bg-accent text-accent-ink`}>Deliver tokens</button>
          ) : (
            <p className="text-sm text-warn">Waiting for the admin to set the real token address.</p>
          )
        )}
        {phase !== "pre-tge" && unsold > 0n && (
          <button onClick={reclaim} disabled={busy} className={`${button} border border-line`}>Reclaim unsold collateral</button>
        )}
      </div>
    );
  } else if (purchase > 0n) {
    content =
      phase === "settled" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">The seller didn't deliver in time. You can claim your payment back plus your share of the seller's collateral.</p>
          <button onClick={claimDefault} disabled={busy} className={`${button} bg-accent text-accent-ink`}>Claim default</button>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {phase === "delivery" ? "Waiting for the seller to deliver your tokens." : "You're in. Delivery opens at TGE."}
        </p>
      );
  } else {
    content = <p className="text-sm text-muted">{phase === "pre-tge" ? "Sold out." : "Buying closed at TGE."}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {content}
      {!address && <p className="text-xs text-muted">Connect your wallet to see your actions.</p>}
      {steps && <TxSteps steps={steps} />}
    </div>
  );
}
