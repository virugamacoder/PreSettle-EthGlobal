// OTCMarket interface the app expects (docs/CONTRACT_INTERFACE.md).
// Replace with the real ABI from the contract developer when it's shared.
import { parseAbi } from "viem";

export const OTC_ABI = parseAbi([
  "struct CreateParams { address offerToken; uint256 offerAmount; address wantToken; uint256 wantAmount; bool partialAllowed; uint64 deadline; address privateTaker; address broker; uint16 brokerFeeBps; }",
  "struct Order { address maker; address offerToken; uint256 offerAmount; address wantToken; uint256 wantAmount; uint256 filledOffer; bool partialAllowed; uint64 deadline; address privateTaker; address broker; uint16 brokerFeeBps; bool cancelled; }",
  "function createOrder(CreateParams p) returns (uint256 orderId)",
  "function getOrder(uint256 orderId) view returns (Order)",
  "function fill(uint256 orderId, uint256 offerAmount)",
  "function cancel(uint256 orderId)",
  "function withdraw(address token)",
  "function balances(address account, address token) view returns (uint256)",
  "event OrderCreated(uint256 indexed orderId, address indexed maker, address offerToken, address wantToken, uint256 offerAmount, uint256 wantAmount, uint64 deadline, address broker, address privateTaker)",
]);

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
