import { useState } from "react";
import { Link } from "react-router";
import { erc20Abi, parseEventLogs, parseUnits } from "viem";
import { useAccount, useConfig } from "wagmi";
import { readContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ExpirationTime } from "@arkiv-network/sdk";
import { addr, dec, u64 } from "@arkiv-network/sdk/schema";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { PREMARKET_ABI, PRE_TOKEN_DECIMALS, collateralFor } from "../contracts/premarket.js";
import { PremarketOffer } from "../arkiv/schemas.js";
import { getArkivWallet } from "../arkiv/wallet.js";
import { arkivExplorer } from "../arkiv/client.js";
import { arcExplorer, formatAmount, timeLeft } from "../lib/format.js";
import { isDecimal, mulDecimal } from "../lib/amounts.js";
import { useMarkets } from "../hooks/usePremarket.js";
import { useTokens } from "../hooks/useTokens.js";
import { TxSteps, errorMessage, initSteps, updateStep } from "./TxSteps.jsx";

const field = "rounded-md border border-line bg-page px-3 py-2 text-sm text-ink";
const MAX_ARKIV_SECONDS = 180 * 86_400; // Arkiv max lifetime is ~182.5 days

export function CreatePremarketForm() {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const { markets, isLoading } = useMarkets();
  const { tokens } = useTokens();
  const collaterals = tokens.filter((t) => t.kind === "collateral");
  const now = Date.now() / 1000;
  const openMarkets = markets.filter((m) => m.active && Number(m.tge) > now);

  const [marketId, setMarketId] = useState("");
  const [collateral, setCollateral] = useState(settings.arc.usdc);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [steps, setSteps] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const market = openMarkets.find((m) => m.id === marketId);
  const collSymbol = collaterals.find((t) => t.address === collateral)?.symbol ?? "USDC";
  const valid = market && isDecimal(amount) && Number(amount) > 0 && isDecimal(price) && Number(price) > 0;

  if (!settings.arc.premarket) {
    return <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">The Premarket contract address isn't configured yet (VITE_PREMARKET_CONTRACT_ARC_TESTNET).</p>;
  }

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setResult(null);
    let s = initSteps([
      { id: "approve", label: `Approve ${collSymbol} collateral`, chain: "Arc" },
      { id: "create", label: "Lock collateral and create the offer", chain: "Arc" },
      { id: "publish", label: "Publish the offer to the order book", chain: "Arkiv" },
    ]);
    const set = (id, patch) => setSteps((s = updateStep(s, id, patch)));
    setSteps(s);
    let step = "approve";
    try {
      await switchChain(config, { chainId: arcTestnet.id });
      const collDecimals = await readContract(config, { chainId: arcTestnet.id, address: collateral, abi: erc20Abi, functionName: "decimals" });
      const tokenAmount = parseUnits(amount, PRE_TOKEN_DECIMALS);
      const pricePerToken = parseUnits(price, collDecimals);
      const lock = collateralFor(tokenAmount, pricePerToken);

      set("approve", { status: "active" });
      const balance = await readContract(config, { chainId: arcTestnet.id, address: collateral, abi: erc20Abi, functionName: "balanceOf", args: [address] });
      if (balance < lock) throw new Error(`Insufficient ${collSymbol} for the collateral`);
      const allowance = await readContract(config, {
        chainId: arcTestnet.id, address: collateral, abi: erc20Abi, functionName: "allowance", args: [address, settings.arc.premarket],
      });
      if (allowance < lock) {
        const hash = await writeContract(config, {
          chainId: arcTestnet.id, address: collateral, abi: erc20Abi, functionName: "approve", args: [settings.arc.premarket, lock],
        });
        await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
        set("approve", { status: "done", link: arcExplorer.tx(hash) });
      } else {
        set("approve", { status: "skipped" });
      }

      step = "create";
      set("create", { status: "active" });
      const createHash = await writeContract(config, {
        chainId: arcTestnet.id, address: settings.arc.premarket, abi: PREMARKET_ABI, functionName: "createOffer",
        args: [BigInt(market.id), collateral, tokenAmount, pricePerToken],
      });
      const receipt = await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash: createHash });
      const [created] = parseEventLogs({ abi: PREMARKET_ABI, eventName: "OfferCreated", logs: receipt.logs });
      if (!created) throw new Error("Offer created but no OfferCreated event was found");
      const offerId = created.args.offerId;
      set("create", { status: "done", link: arcExplorer.tx(createHash) });

      // The listing lives until the delivery window closes (capped at Arkiv's max lifetime).
      step = "publish";
      set("publish", { status: "active" });
      const end = Number(market.tge) + Number(market.deliveryWindow);
      const expiration = end - Date.now() / 1000 > MAX_ARKIV_SECONDS ? ExpirationTime.max() : ExpirationTime.atDate(new Date(end * 1000));
      const arkiv = await getArkivWallet(config);
      const { entityKey, txHash } = await arkiv.createEntity(
        PremarketOffer,
        {
          seller: addr(address),
          marketId: u64(BigInt(market.id)),
          symbol: market.symbol,
          collateralToken: addr(collateral),
          price: dec(price),
          tokenAmount: dec(amount),
          offerId: u64(offerId),
          tge: u64(BigInt(market.tge)),
          arcTx: createHash,
        },
        { expiration },
      );
      set("publish", { status: "done", link: arkivExplorer.tx(txHash) });
      setResult({ entityKey, offerId: offerId.toString() });
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    } catch (err) {
      set(step, { status: "error", error: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <label className="flex flex-col gap-1 text-sm">
          Market
          <select value={marketId} onChange={(e) => setMarketId(e.target.value)} className={field} required>
            <option value="">{isLoading ? "Loading markets…" : openMarkets.length ? "Select a pre-launch token" : "No markets before TGE"}</option>
            {openMarkets.map((m) => (
              <option key={m.id} value={m.id}>{m.symbol} · TGE in {timeLeft(Number(m.tge))}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Amount to sell
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} placeholder="10000" className={`${field} num`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Price per token
            <div className="flex gap-2">
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.trim())} placeholder="0.25" className={`${field} num min-w-0 flex-1`} />
              <select value={collateral} onChange={(e) => setCollateral(e.target.value)} className={field} aria-label="Collateral token">
                {collaterals.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
              </select>
            </div>
          </label>
        </div>
        {market && (
          <p className="text-xs text-muted">
            After TGE ({new Date(Number(market.tge) * 1000).toLocaleString()}) you have {Math.round(Number(market.deliveryWindow) / 60)} minutes to deliver the real tokens. If you don't, buyers can claim your collateral.
          </p>
        )}
      </div>

      <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Collateral you lock</p>
          <p className="num mt-1 text-2xl font-semibold">{valid ? formatAmount(mulDecimal(amount, price)) : "–"} <span className="text-base text-muted">{collSymbol}</span></p>
          <p className="mt-2 text-xs text-muted">100% of the deal value stays in escrow on Arc until you deliver, cancel, or default.</p>
        </div>
        {steps && <TxSteps steps={steps} />}
        {result ? (
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-accent">Offer #{result.offerId} is live.</p>
            <Link to={`/premarket/${result.entityKey}`} className="text-accent hover:underline">Open the offer</Link>
          </div>
        ) : (
          <button type="submit" disabled={!isConnected || !valid || busy} className="rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50">
            {!isConnected ? "Connect a wallet" : busy ? "Confirm in your wallet…" : "Create offer"}
          </button>
        )}
      </aside>
    </form>
  );
}
