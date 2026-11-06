# Contract interface (what the app expects)

For the smart contract developer. This lists the functions and events the **frontend and backend call**, so the app and the contracts line up. It's a proposal: if the real contracts differ, send the ABI and the app will be adjusted.

**Please share when deployed (Arc Testnet, chain 5042002):**
- ABI JSON for each contract
- the deployed addresses
- the Arc Studio project URL (Arc prize requirement)

Token amounts use the token's own decimals. **USDC and EURC on Arc use 6 decimals** through their ERC-20 interface (`0x3600000000000000000000000000000000000000` / `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`).

## OTCMarket

| Function | Used by | Purpose |
|---|---|---|
| `getOrder(uint256 orderId) view returns (Order)` | backend `/v1/orders`, frontend | Verify Arkiv listings, show remaining amount |
| `createOrder(CreateParams p) returns (uint256 orderId)` | frontend "Create order" | Lock the offer token, open the order |
| `fill(uint256 orderId, uint256 offerAmount)` | frontend "Buy/Sell" | Partial or full fill |
| `cancel(uint256 orderId)` | frontend dashboard | Maker refunds the unfilled amount |
| `expire(uint256 orderId)` | backend keeper | Anyone refunds the maker after the deadline |
| `withdraw(address token)` | frontend dashboard | Pull-payment of proceeds and fees |
| `balances(address account, address token) view returns (uint256)` | frontend dashboard | Amount waiting to be withdrawn |

Structs and event the app uses today ([backend/src/contracts/otc.js](../backend/src/contracts/otc.js), [frontend/src/contracts/otc.js](../frontend/src/contracts/otc.js)):

```solidity
struct CreateParams {
  address offerToken; uint256 offerAmount;      // what the maker locks
  address wantToken;  uint256 wantAmount;       // what the maker wants in total
  bool partialAllowed; uint64 deadline;         // unix seconds
  address privateTaker;                         // 0x0 = anyone; set for broker deals
  address broker; uint16 brokerFeeBps;          // 0x0 / 0 when no broker
}

struct Order {
  address maker; address offerToken; uint256 offerAmount;
  address wantToken; uint256 wantAmount; uint256 filledOffer;
  bool partialAllowed; uint64 deadline; address privateTaker;
  address broker; uint16 brokerFeeBps; bool cancelled;
}

event OrderCreated(uint256 indexed orderId, address indexed maker, address offerToken, address wantToken,
                   uint256 offerAmount, uint256 wantAmount, uint64 deadline, address broker, address privateTaker);
```

The frontend reads the new `orderId` from `OrderCreated` in the transaction receipt, so the **event signature must match exactly** (or send the ABI and the app is updated). Also emit `OrderFilled`, `OrderCancelled`, `OrderExpired`.

`fill(orderId, offerAmount)`: `offerAmount` is how much of the maker's offered token the taker takes; the contract pulls the pro-rata `wantAmount` from the taker.

## PremarketMarket

**Units:** `tokenAmount` is the pre-launch token amount with **18 decimals** (the real token doesn't exist before TGE). `pricePerToken` is in collateral-token units (USDC/EURC, 6 decimals) per 1 whole token. Collateral or payment = `tokenAmount * pricePerToken / 1e18` (the app rounds up). One `buy` is one buyer's purchase on one offer; `deliver` sends real tokens to all buyers of that offer. `deliver` pulls `sold` from the seller converted to the real token's decimals (`sold * 10^decimals / 1e18`, rounded up); the frontend approves exactly that amount.

| Function | Used by | Purpose |
|---|---|---|
| `marketCount() view returns (uint256)` | frontend | Number of markets (ids 0..n-1) |
| `getMarket(uint256 marketId) view returns (Market)` | frontend | Symbol, TGE time, delivery window, real token |
| `getOffer(uint256 offerId) view returns (Offer)` | backend, frontend | Offer state for display and verification |
| `purchases(uint256 offerId, address buyer) view returns (uint256)` | frontend | How much a buyer bought (18-dec) |
| `createOffer(uint256 marketId, address collateralToken, uint256 tokenAmount, uint256 pricePerToken) returns (uint256 offerId)` | frontend | Seller locks 100% collateral |
| `buy(uint256 offerId, uint256 tokenAmount)` | frontend | Buyer pays before TGE |
| `deliver(uint256 offerId)` | frontend | Seller delivers real tokens in [TGE, TGE + deliveryWindow) |
| `claimDefault(uint256 offerId)` | frontend, backend keeper | After the window: buyers get payment + pro-rata seller collateral |
| `cancelOffer(uint256 offerId)` | frontend | Seller cancels when nothing is sold |
| `reclaimUnsold(uint256 offerId)` | frontend | Seller reclaims collateral for the unsold part after TGE |
| `createMarket(string symbol, uint64 tge, uint64 deliveryWindow) returns (uint256)` | frontend admin | New market |
| `setRealToken(uint256 marketId, address token)` | frontend admin | Set the real token at TGE |
| `raiseDispute` / `resolveDispute` | frontend | Dispute flow (arbiter), signatures TBD |

```solidity
struct Market { string symbol; uint64 tge; uint64 deliveryWindow; address realToken; bool active; }
struct Offer {
  uint256 marketId; address seller; address collateralToken;
  uint256 tokenAmount; uint256 pricePerToken; uint256 sellerCollateral;
  uint256 sold; uint8 status;   // 0 Open, 1 Delivered, 2 Defaulted, 3 Cancelled, 4 Disputed, 5 Voided
}
event OfferCreated(uint256 indexed offerId, uint256 indexed marketId, address indexed seller,
                   address collateralToken, uint256 tokenAmount, uint256 pricePerToken);
event Purchased(uint256 indexed offerId, address indexed buyer, uint256 tokenAmount, uint256 paid);
```

The frontend reads the new `offerId` from `OfferCreated` in the receipt, so the event signature must match (or send the ABI). Frontend copy: [frontend/src/contracts/premarket.js](../frontend/src/contracts/premarket.js).

## BrokerRegistry (optional)

| Function | Used by | Purpose |
|---|---|---|
| `setBroker(address broker, uint64 expiry)` | backend (ENS → Arc sync) | Mirror a broker's ENS license on Arc |
| `isActiveBroker(address) view returns (bool)` | OTCMarket, frontend | Block deals by revoked or expired brokers |
