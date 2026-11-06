// Arkiv entity schemas for the Pre Settle order book.
// Identical copy of backend/src/arkiv/schemas.js: keep both in sync.
//
// Rules (see docs/PLAN.md §7):
// - Only columns used in filters are indexed (indexes cost on every write).
// - Named schemas tag entities, but the tag is NOT a security boundary:
//   always filter by owner/creator, and verify orders against Arc.
// - Funds never live here: Arkiv holds listings, Arc holds the money.
import { defineSchema, str, addr, dec, u64, bool, bytes } from "@arkiv-network/sdk/schema";

// OTC order. Owner: maker. Expires at the order deadline.
export const OtcOrder = defineSchema("presettle.otc_order.v1", {
  maker: addr().indexed(),
  side: str().indexed(), // "sell" | "buy"
  offerToken: addr().indexed(),
  wantToken: addr().indexed(),
  price: dec().indexed(), // wantToken per 1 offerToken, human units
  amount: dec(), // offer amount, human units
  partial: bool().indexed(), // partial fills allowed
  orderId: u64().indexed(), // id from the Arc OrderCreated event
  deadline: u64().indexed(), // unix seconds
  broker: addr().optional(),
  brokerEns: str().optional(),
  makerEns: str().optional(),
  arcTx: str(),
  termsRef: str().optional(), // public Swarm reference (never an encrypted one)
});

// Premarket offer. Owner: seller. Expires after TGE + delivery window.
export const PremarketOffer = defineSchema("presettle.pm_offer.v1", {
  seller: addr().indexed(),
  marketId: u64().indexed(),
  symbol: str().indexed(),
  collateralToken: addr().indexed(),
  price: dec().indexed(),
  tokenAmount: dec(),
  offerId: u64().indexed(),
  tge: u64().indexed(),
  arcTx: str(),
});

// Broker deal link. Owner: broker. Expires after 10 minutes.
export const BrokerLink = defineSchema("presettle.broker_link.v1", {
  broker: addr().indexed(),
  client: addr().indexed(),
  brokerEns: str(),
  offerToken: addr(),
  wantToken: addr(),
  price: dec(),
  amount: dec(),
  feeBps: u64(),
});

// Fill record. Owner: taker. Created read-only (an immutable track record).
export const Fill = defineSchema("presettle.fill.v1", {
  market: str().indexed(), // "otc" | "premarket"
  refId: u64().indexed(), // orderId / offerId
  orderKey: str().optional(), // Arkiv $key of the order entity
  baseToken: addr().optional(), // traded token (OTC); premarket uses symbol
  quoteToken: addr().optional(), // payment token (USDC/EURC)
  symbol: str().optional(), // premarket token symbol
  taker: addr().indexed(),
  maker: addr().indexed(),
  amount: dec(),
  price: dec(),
  arcTx: str(),
});

// Trader profile. Owner: trader. Extended on each login.
export const Profile = defineSchema("presettle.profile.v1", {
  ens: str().indexed(),
  prefTokens: str().optional(),
  minSize: dec().optional(),
  bio: bytes().optional(),
});

// Curated token list. Written only by the admin wallet; read with createdBy(admin).
export const Token = defineSchema("presettle.token.v1", {
  kind: str().indexed(), // "otc" | "premarket" | "collateral"
  address: addr().indexed(),
  symbol: str().indexed(),
  name: str(),
  decimals: u64(),
  logo: str().optional(),
  cmcId: u64().optional(), // CoinMarketCap ID for the reference price
});

export const schemas = { OtcOrder, PremarketOffer, BrokerLink, Fill, Profile, Token };
