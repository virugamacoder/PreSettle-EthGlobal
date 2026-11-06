import { OFFER_STATUS } from "../contracts/premarket.js";

/** Explains the offer's state when buying isn't possible. */
export function PremarketActions({ offer, phase, isSeller }) {
  if (!offer) return <p className="text-sm text-muted">Waiting for the escrow contract…</p>;
  if (offer.status !== 0) return <p className="text-sm text-muted">This offer is {OFFER_STATUS[offer.status]?.toLowerCase()}.</p>;
  if (isSeller) return <p className="text-sm text-muted">This is your offer.</p>;
  if (phase !== "pre-tge") return <p className="text-sm text-muted">Buying closed at TGE.</p>;
  return <p className="text-sm text-muted">Sold out.</p>;
}
