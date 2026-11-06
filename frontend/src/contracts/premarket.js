// PremarketMarket interface the app expects (docs/CONTRACT_INTERFACE.md).
// Replace with the real ABI from the contract developer when it's shared.
//
// Units:
// - tokenAmount: pre-launch token amount with 18 decimals (the real token
//   doesn't exist before TGE, so 18 is the convention)
// - pricePerToken: collateral token units (USDC/EURC: 6 decimals) per 1 whole token
// - collateral / payment = tokenAmount * pricePerToken / 1e18
import { parseAbi } from "viem";

export const PRE_TOKEN_DECIMALS = 18;

export const OFFER_STATUS = ["Open", "Delivered", "Defaulted", "Cancelled", "Disputed", "Voided"];

export const PREMARKET_ABI = parseAbi([
  "struct Market { string symbol; uint64 tge; uint64 deliveryWindow; address realToken; bool active; }",
  "struct Offer { uint256 marketId; address seller; address collateralToken; uint256 tokenAmount; uint256 pricePerToken; uint256 sellerCollateral; uint256 sold; uint8 status; }",
  "function marketCount() view returns (uint256)",
  "function getMarket(uint256 marketId) view returns (Market)",
  "function getOffer(uint256 offerId) view returns (Offer)",
  "function purchases(uint256 offerId, address buyer) view returns (uint256)",
  "function createOffer(uint256 marketId, address collateralToken, uint256 tokenAmount, uint256 pricePerToken) returns (uint256 offerId)",
  "function buy(uint256 offerId, uint256 tokenAmount)",
  "function deliver(uint256 offerId)",
  "function claimDefault(uint256 offerId)",
  "function cancelOffer(uint256 offerId)",
  "function reclaimUnsold(uint256 offerId)",
  "function createMarket(string symbol, uint64 tge, uint64 deliveryWindow) returns (uint256 marketId)",
  "function setRealToken(uint256 marketId, address token)",
  "event OfferCreated(uint256 indexed offerId, uint256 indexed marketId, address indexed seller, address collateralToken, uint256 tokenAmount, uint256 pricePerToken)",
  "event Purchased(uint256 indexed offerId, address indexed buyer, uint256 tokenAmount, uint256 paid)",
]);

/** Collateral units for `tokenAmount` (18-dec) at `pricePerToken` (collateral units), rounded up. */
export function collateralFor(tokenAmount, pricePerToken) {
  const scale = 10n ** BigInt(PRE_TOKEN_DECIMALS);
  return (tokenAmount * pricePerToken + scale - 1n) / scale;
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
