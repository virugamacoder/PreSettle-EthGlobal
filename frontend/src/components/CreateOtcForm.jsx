import { useState } from "react";
import { Link } from "react-router";
import { isAddress } from "viem";
import { useAccount, useConfig, useEnsName } from "wagmi";
import { sepolia } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { arkivExplorer } from "../arkiv/client.js";
import { formatAmount } from "../lib/format.js";
import { isDecimal, mulDecimal } from "../lib/amounts.js";
import { CREATE_STEPS, createOtcOrder } from "../lib/otcActions.js";
import { useTokens } from "../hooks/useTokens.js";
import { TxSteps, errorMessage, initSteps, updateStep } from "./TxSteps.jsx";

const DURATIONS = [
  { label: "1 hour", seconds: 3_600 },
  { label: "24 hours", seconds: 86_400 },
  { label: "3 days", seconds: 259_200 },
  { label: "7 days", seconds: 604_800 },
];

const field = "rounded-md border border-line bg-page px-3 py-2 text-sm text-ink";

export function CreateOtcForm() {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address, chainId: sepolia.id });
  const { tokens } = useTokens();
  const quoteTokens = tokens.filter((t) => t.kind === "collateral");
  const baseTokens = tokens.filter((t) => t.kind !== "collateral");

  const [side, setSide] = useState("sell");
  const [base, setBase] = useState("");
  const [customBase, setCustomBase] = useState("");
  const [quote, setQuote] = useState(settings.arc.usdc);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [partial, setPartial] = useState(true);
  const [duration, setDuration] = useState(DURATIONS[1].seconds);

  const [steps, setSteps] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const baseAddress = base === "custom" ? customBase.trim() : base;
  const valid =
    isAddress(baseAddress) &&
    baseAddress.toLowerCase() !== quote.toLowerCase() &&
    isDecimal(amount) && Number(amount) > 0 &&
    isDecimal(price) && Number(price) > 0;
  const total = valid ? mulDecimal(amount, price) : null;
  const quoteSymbol = quoteTokens.find((t) => t.address === quote)?.symbol ?? "USDC";

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setResult(null);
    let s = initSteps(CREATE_STEPS);
    const set = (id, patch) => setSteps((s = updateStep(s, id, patch)));
    setSteps(s);

    try {
      const created = await createOtcOrder(
        config,
        {
          maker: address,
          makerEns: ensName,
          side,
          base: baseAddress,
          quote,
          amount,
          price,
          partial,
          deadline: Math.floor(Date.now() / 1000) + duration,
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

  if (!settings.arc.otc) {
    return (
      <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
        The OTC contract address isn't configured yet (VITE_OTC_CONTRACT_ARC_TESTNET).
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <div className="flex rounded-lg border border-line bg-page p-1" role="tablist" aria-label="Order side">
          {["sell", "buy"].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={side === v}
              onClick={() => setSide(v)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${side === v ? (v === "sell" ? "bg-sell/15 text-sell" : "bg-buy/15 text-buy") : "text-muted"}`}
            >
              {v === "sell" ? "Sell tokens" : "Buy tokens"}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Token to {side}
          <select value={base} onChange={(e) => setBase(e.target.value)} className={field} required>
            <option value="">Select a token</option>
            {baseTokens.map((t) => (
              <option key={t.address} value={t.address}>{t.symbol} · {t.name}</option>
            ))}
            <option value="custom">Other token address…</option>
          </select>
        </label>
        {base === "custom" && (
          <input
            value={customBase}
            onChange={(e) => setCustomBase(e.target.value)}
            placeholder="0x… token address on Arc Testnet"
            className={`${field} num`}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Amount
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} placeholder="1000" className={`${field} num`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Price per token
            <div className="flex gap-2">
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.trim())} placeholder="0.05" className={`${field} num min-w-0 flex-1`} />
              <select value={quote} onChange={(e) => setQuote(e.target.value)} className={field} aria-label="Quote token">
                {quoteTokens.map((t) => (
                  <option key={t.address} value={t.address}>{t.symbol}</option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Order ends in
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
              {DURATIONS.map((d) => (
                <option key={d.seconds} value={d.seconds}>{d.label}</option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend className="mb-1">Lot</legend>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2"><input type="radio" checked={partial} onChange={() => setPartial(true)} /> Partial fills</label>
              <label className="flex items-center gap-2"><input type="radio" checked={!partial} onChange={() => setPartial(false)} /> Full only</label>
            </div>
          </fieldset>
        </div>
      </div>

      <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{side === "sell" ? "You receive" : "You pay"}</p>
          <p className="num mt-1 text-2xl font-semibold">{total ? formatAmount(total) : "–"} <span className="text-base text-muted">{quoteSymbol}</span></p>
          <p className="mt-2 text-xs text-muted">
            {side === "sell" ? "Your tokens" : `Your ${quoteSymbol}`} stay locked in escrow on Arc until the order is filled, cancelled, or expires.
          </p>
        </div>

        {steps && <TxSteps steps={steps} />}

        {result ? (
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-accent">Order #{result.orderId} is live.</p>
            <Link to={`/otc/${result.entityKey}`} className="text-accent hover:underline">Open the order</Link>
            <a href={arkivExplorer.entity(result.entityKey)} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">View the Arkiv entity</a>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!isConnected || !valid || busy}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            {!isConnected ? "Connect a wallet" : busy ? "Confirm in your wallet…" : "Create order"}
          </button>
        )}
        <p className="text-xs text-muted">Three signatures: approve and escrow on Arc, then the listing on Arkiv (needs a little tGLM for Arkiv gas).</p>
      </aside>
    </form>
  );
}
