# Contract interface (what the app expects)

For the smart contract developer. These are the functions and events the **frontend, backend and keeper call**. If the contracts match this exactly, the app needs no changes. Extra functions are fine; renamed or reordered ones break the app.

> **Status:** the contracts currently in `contracts/` (`OpenMarket.sol`, `PreMarket.sol`) **don't match this interface**. They're being rebuilt in **Arc Studio**.

**Network:** Arc Testnet, chain **5042002**. **USDC** `0x3600000000000000000000000000000000000000` and **EURC** `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` both use **6 decimals** through their ERC-20 interface. Never use `msg.value` (native USDC has 18 decimals).

---

## OTCMarket

```solidity
struct CreateParams {
  address offerToken; uint256 offerAmount;      // what the maker locks
  address wantToken;  uint256 wantAmount;       // TOTAL price for the whole offerAmount
  bool partialAllowed; uint64 deadline;         // unix seconds
  address privateTaker;                         // 0x0 = anyone; set for broker deals
  address broker; uint16 brokerFeeBps;          // 0x0 / 0 when no broker (must be allowed)
}

struct Order {
  address maker; address offerToken; uint256 offerAmount;
  address wantToken; uint256 wantAmount; uint256 filledOffer;
  bool partialAllowed; uint64 deadline; address privateTaker;
  address broker; uint16 brokerFeeBps; bool cancelled;
}

function createOrder(CreateParams calldata p) external returns (uint256 orderId);
function getOrder(uint256 orderId) external view returns (Order memory);
function fill(uint256 orderId, uint256 offerAmount) external;
function cancel(uint256 orderId) external;
function expire(uint256 orderId) external;
function withdraw(address token) external;
function balances(address account, address token) external view returns (uint256);
function setPlatformFee(uint16 bps) external;   // owner, max 100

event OrderCreated(uint256 indexed orderId, address indexed maker, address offerToken, address wantToken,
                   uint256 offerAmount, uint256 wantAmount, uint64 deadline, address broker, address privateTaker);
event OrderFilled(uint256 indexed orderId, address indexed taker, uint256 offerAmount, uint256 wantAmount);
event OrderCancelled(uint256 indexed orderId);
event OrderExpired(uint256 indexed orderId);
event Withdrawn(address indexed account, address indexed token, uint256 amount);
```

| Function | Used by | Behaviour the app relies on |
|---|---|---|
| `createOrder` | frontend "Create order" | `maker = msg.sender`; pulls `offerAmount`; requires `deadline > now`, `brokerFeeBps ≤ 200`; **emits `OrderCreated` with the id** (the frontend reads it from the receipt) |
| `getOrder` | backend `/v1/orders`, keeper, frontend | A listing is shown only if `maker` = the Arkiv owner, `!cancelled`, `deadline > now` and `offerAmount − filledOffer > 0` |
| `fill(id, x)` | frontend "Buy/Sell" | Before the deadline; respects `privateTaker` and `partialAllowed`. The **contract computes the price**: `pay = ceil(x · wantAmount / offerAmount)`. Platform fee, broker fee and maker share are **credited** to `balances`; the taker receives `x` |
| `cancel(id)` | frontend (maker) | Sets `cancelled = true` and credits the unfilled amount to the maker's balance |
| `expire(id)` | backend keeper | **Anyone**, at or after the deadline. Sets `cancelled = true` (so the keeper doesn't retry) and credits the unfilled amount to the **maker** |
| `withdraw` / `balances` | frontend dashboard | Pull-payment of proceeds, fees and refunds |

---

## PremarketMarket

**Units:** `tokenAmount`, `sold` and `purchases` use **18 decimals** (the real token doesn't exist before TGE). `pricePerToken` is in collateral units (USDC/EURC, 6 decimals) per 1 whole token. Payment and collateral = `ceil(tokenAmount · pricePerToken / 1e18)`. At delivery the seller sends `ceil(sold · 10^realDecimals / 1e18)` of the real token; the frontend approves exactly that.

```solidity
struct Market { string symbol; uint64 tge; uint64 deliveryWindow; address realToken; bool active; }
struct Offer {
  uint256 marketId; address seller; address collateralToken;
  uint256 tokenAmount; uint256 pricePerToken; uint256 sellerCollateral;
  uint256 sold; uint8 status;   // 0 Open, 1 Delivered, 2 Defaulted, 3 Cancelled, 4 Disputed, 5 Voided
}

function marketCount() external view returns (uint256);
function getMarket(uint256 marketId) external view returns (Market memory);
function getOffer(uint256 offerId) external view returns (Offer memory);
function purchases(uint256 offerId, address buyer) external view returns (uint256);
function createMarket(string calldata symbol, uint64 tge, uint64 deliveryWindow) external returns (uint256 marketId);
function setRealToken(uint256 marketId, address token) external;
function createOffer(uint256 marketId, address collateralToken, uint256 tokenAmount, uint256 pricePerToken)
    external returns (uint256 offerId);
function buy(uint256 offerId, uint256 tokenAmount) external;
function deliver(uint256 offerId) external;
function claimDefault(uint256 offerId) external;
function cancelOffer(uint256 offerId) external;
function reclaimUnsold(uint256 offerId) external;

event OfferCreated(uint256 indexed offerId, uint256 indexed marketId, address indexed seller,
                   address collateralToken, uint256 tokenAmount, uint256 pricePerToken);
event Purchased(uint256 indexed offerId, address indexed buyer, uint256 tokenAmount, uint256 paid);
// also: MarketCreated, RealTokenSet, Delivered, Defaulted, OfferCancelled, UnsoldReclaimed
```

| Function | Who / when | Behaviour |
|---|---|---|
| `createMarket`, `setRealToken` | owner | New market (`tge > now`); real token set at or after TGE. TGE can't change once a market has offers |
| `createOffer` | seller, before TGE | Pulls **100% collateral** (`sellerCollateral`), computed on-chain; USDC/EURC only |
| `buy(id, n)` | buyer, before TGE | Contract computes `paid`; `sold += n`; at most 50 buyers per offer |
| `deliver(id)` | seller, `TGE ≤ now < TGE + window` | Status → Delivered **first**, then real tokens to every buyer; seller gets payments − platform fee + collateral for the sold part |
| `claimDefault(id)` | **anyone**, `now ≥ TGE + window` | Status → Defaulted **first**; each buyer gets their payment + pro-rata collateral |
| `cancelOffer(id)` | seller, before TGE, `sold == 0` | Refunds all collateral |
| `reclaimUnsold(id)` | seller, after TGE, once | Refunds collateral for the unsold part only |

Every settlement function can succeed **only once**.

Optional (Arc prize): a reusable `ConditionalEscrow` with `raiseDispute` / `resolveDispute` (separate arbiter role) and a default ruling after a timeout. VOID refunds everyone.

## BrokerRegistry (paused)
Not needed for now (the broker feature is hidden). `OTCMarket` must accept `broker = 0x0`.

---

## Deliverables (please share when deployed)
- Arc Studio **project URL** (Arc prize requirement)
- `contracts/deployments/arc-testnet.json`: addresses, tx hashes, deploy block
- ABI JSON for each contract in `contracts/abi/`
- Owner setup done: platform fee, collateral allow-list, a demo market (TGE about 10 minutes out, 3–5 minute delivery window)
