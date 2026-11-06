import { BaseError, ContractFunctionRevertedError } from "viem";
/**
 * Progress list for multi-transaction flows.
 * steps: [{ id, label, chain, status: "idle"|"active"|"done"|"error"|"skipped", link?, error? }]
 */
const ICON = { idle: "○", active: "◐", done: "●", error: "✕", skipped: "–" };
const TONE = {
  idle: "text-muted",
  active: "text-warn",
  done: "text-accent",
  error: "text-sell",
  skipped: "text-muted",
};

/**
 * `onRetry`: when set, shows a button that reruns only the failed Arkiv step
 * (used when the money already moved on Arc and just the listing/record failed).
 */
export function TxSteps({ steps, onRetry, busy = false }) {
  return (
    <div className="flex flex-col gap-2">
    <ol className="flex flex-col gap-2" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s.id} className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-4 text-center ${TONE[s.status]}`} aria-hidden>{ICON[s.status]}</span>
            <span className={s.status === "idle" ? "text-muted" : ""}>
              {i + 1}. {s.label}
            </span>
            {s.chain && <span className="ml-auto text-xs text-muted">{s.chain}</span>}
          </div>
          {s.link && (
            <a href={s.link} target="_blank" rel="noreferrer" className="ml-6 text-xs text-accent hover:underline">
              View transaction
            </a>
          )}
          {s.error && <p className="ml-6 text-xs text-sell">{s.error}</p>}
        </li>
      ))}
    </ol>
    {onRetry && (
      <div className="flex flex-col gap-1 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs">
        <span>The Arc transaction went through; only the Arkiv step failed. Retry it without paying again:</span>
        <button type="button" onClick={onRetry} disabled={busy} className="w-fit rounded-full bg-brand-gradient px-3 py-1.5 font-semibold text-accent-ink disabled:opacity-50">
          {busy ? "Confirm in your wallet…" : "Retry the Arkiv step"}
        </button>
      </div>
    )}
    </div>
  );
}

export function initSteps(defs) {
  return defs.map((d) => ({ status: "idle", ...d }));
}

export function updateStep(steps, id, patch) {
  return steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

/** Shortest useful message from wallet / viem errors. */
// Plain-language text for the escrow contracts' custom errors. Anything not
// listed falls back to the error name split into words.
const CONTRACT_ERRORS = {
  BelowMinimumPurchase: "A first purchase must be at least 1/50 of the offer (or everything that's left).",
  BuyerLimitReached: "This offer already has the maximum of 50 buyers.",
  Oversold: "That's more than is left in this offer.",
  SellerCannotBuy: "You can't buy your own offer.",
  MakerCannotFill: "You can't fill your own order.",
  UnauthorizedTaker: "This order is reserved for a specific taker.",
  PartialFillNotAllowed: "This order must be filled in full.",
  InvalidFillAmount: "That amount is more than what's left in the order.",
  OrderDeadlineReached: "This order has passed its deadline.",
  OrderNotExpired: "This order hasn't reached its deadline yet.",
  OrderClosed: "This order is already filled, cancelled or expired.",
  NotMaker: "Only the order's maker can do this.",
  NotSeller: "Only the offer's seller can do this.",
  OfferNotOpen: "This offer is already settled or cancelled.",
  OfferHasSales: "Offers with sales can't be cancelled.",
  TgeReached: "TGE has passed for this market.",
  TgeNotReached: "TGE hasn't happened yet.",
  DeliveryWindowClosed: "The delivery window has closed.",
  DeliveryWindowNotClosed: "The delivery window is still open.",
  RealTokenNotSet: "The admin hasn't set the real token yet.",
  MarketInactive: "This market is paused.",
  InvalidDeadline: "The deadline must be in the future.",
  InvalidCollateralToken: "Collateral must be USDC or EURC.",
  NothingToWithdraw: "Nothing to withdraw for this token.",
  UnsoldAlreadyReclaimed: "Unsold collateral was already reclaimed.",
  NoUnsoldCollateral: "Everything was sold: no unsold collateral to reclaim.",
  UnexpectedTokenBalanceDelta: "This token takes a fee on transfer, so it can't be used.",
  OwnableUnauthorizedAccount: "Only the contract owner can do this.",
  MarketHasOffers: "TGE can't be moved once the market has an offer.",
  InvalidTge: "TGE must be in the future.",
  InvalidDeliveryWindow: "The delivery window must be between 1 minute and 365 days.",
  InvalidSymbolLength: "The symbol must be 1–32 characters.",
  PlatformFeeTooHigh: "The platform fee can be at most 100 bps (1%).",
  RealTokenAlreadySet: "The real token is already set for this market.",
  InvalidRealToken: "That address isn't a usable token (and it can't be USDC or EURC).",
  InvalidRealTokenDecimals: "The real token must have between 6 and 36 decimals.",
};

export function errorMessage(err) {
  if (!err) return "";
  if (/user (rejected|denied)/i.test(err.message || "")) return "Rejected in wallet";
  // JSON-RPC -32005: the RPC node is rate-limiting (often the public Arc RPC MetaMask uses).
  if (err.code === -32005 || err.cause?.code === -32005 || /exceeds defined limit|rate limit/i.test(err.message || "")) {
    return "The network is busy (RPC rate limit). Wait a few seconds and try again. If it keeps happening, set a different Arc RPC in MetaMask (e.g. https://rpc.drpc.testnet.arc.io).";
  }
  if (err instanceof BaseError) {
    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
    const name = reverted?.data?.errorName;
    if (name) return CONTRACT_ERRORS[name] ?? name.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
  return err.shortMessage || err.details || err.message || String(err);
}
