// PremarketMarket ABI, generated from contracts/ on every `npx hardhat compile`
// (hardhat-abi-exporter). Includes the custom errors, so reverts are readable.
//
// Units:
// - tokenAmount: pre-launch token amount with 18 decimals (the real token
//   doesn't exist before TGE, so 18 is the convention)
// - pricePerToken: collateral token units (USDC/EURC: 6 decimals) per 1 whole token
// - collateral / payment = tokenAmount * pricePerToken / 1e18
// Payouts (tokens, refunds, proceeds) are credited to balances(account, token)
// and withdrawn with withdraw(token), like the OTC market.
import PREMARKET_MARKET_ABI from "./abi/PremarketMarket.json";

export const PRE_TOKEN_DECIMALS = 18;

export const OFFER_STATUS = ["Open", "Delivered", "Defaulted", "Cancelled", "Disputed", "Voided"];

export const PREMARKET_ABI = PREMARKET_MARKET_ABI;

/** Collateral units for `tokenAmount` (18-dec) at `pricePerToken` (collateral units), rounded up. */
export function collateralFor(tokenAmount, pricePerToken) {
  const scale = 10n ** BigInt(PRE_TOKEN_DECIMALS);
  return (tokenAmount * pricePerToken + scale - 1n) / scale;
}

/** Most distinct buyers an offer accepts (PremarketMarket.MAX_BUYERS). */
export const MAX_BUYERS = 50n;

/** Smallest first purchase the contract accepts: ceil(tokenAmount / 50), or everything that's left if that's less. */
export function minFirstPurchase(tokenAmount, available) {
  const min = (tokenAmount + MAX_BUYERS - 1n) / MAX_BUYERS;
  return available < min ? available : min;
}

/** Phase of a market at `nowSec`: before TGE, delivery window, or after. */
export function marketPhase(market, nowSec = Math.floor(Date.now() / 1000)) {
  if (!market) return "unknown";
  const tge = Number(market.tge);
  const end = tge + Number(market.deliveryWindow);
  if (nowSec < tge) return "pre-tge";
  if (nowSec < end) return "delivery";
  return "settled";
}
