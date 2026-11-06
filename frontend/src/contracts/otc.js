// OTCMarket ABI, generated from contracts/ on every `npx hardhat compile`
// (hardhat-abi-exporter). Includes the custom errors, so reverts are readable.
import OTC_MARKET_ABI from "./abi/OTCMarket.json";

export const OTC_ABI = OTC_MARKET_ABI;

/**
 * Listing orientation used everywhere in the UI:
 * - base  = the token being traded (e.g. XYZ)
 * - quote = what it's priced in (e.g. USDC)
 * price = quote per 1 base, amount = base amount.
 * A "sell" order offers base and wants quote; a "buy" order offers quote and wants base.
 */
export function orientation(order) {
  return order.side === "sell"
    ? { base: order.offerToken, quote: order.wantToken }
    : { base: order.wantToken, quote: order.offerToken };
}
