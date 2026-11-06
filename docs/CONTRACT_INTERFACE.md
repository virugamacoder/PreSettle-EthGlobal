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
| `createOrder(...) returns (uint256 orderId)` | frontend "Create order" | Lock the offer token, open the order |
| `fill(uint256 orderId, uint256 offerAmount)` | frontend "Buy/Sell" | Partial or full fill |
| `cancel(uint256 orderId)` | frontend dashboard | Maker refunds the unfilled amount |
| `expire(uint256 orderId)` | backend keeper | Anyone refunds the maker after the deadline |
| `withdraw(address token)` | frontend dashboard | Pull-payment of proceeds and fees |

`Order` struct the backend reads today ([backend/src/contracts/otc.js](../backend/src/contracts/otc.js)):

```solidity
struct Order {
  address maker; address offerToken; uint256 offerAmount;
  address wantToken; uint256 wantAmount; uint256 filledOffer;
  bool partialAllowed; uint64 deadline; address privateTaker;
  address broker; uint16 brokerFeeBps; bool cancelled;
}
```

**Events:** `OrderCreated(uint256 indexed orderId, address indexed maker, ...)`. The frontend reads the new `orderId` from this event in the receipt, so please emit it. Also `OrderFilled`, `OrderCancelled`, `OrderExpired`.

## PremarketMarket

| Function | Used by | Purpose |
|---|---|---|
| `getOffer(uint256 offerId) view` | backend, frontend | Offer state for display and verification |
| `getMarket(uint256 marketId) view` | frontend | Symbol, TGE time, delivery window, real token |
| `createOffer(...) returns (uint256 offerId)` | frontend | Seller locks collateral |
| `buy(uint256 offerId, uint256 tokenAmount)` | frontend | Buyer pays before TGE |
| `deliver(uint256 offerId)` | frontend dashboard | Seller delivers real tokens in the TGE window |
| `claimDefault(uint256 offerId)` | frontend, backend keeper | After the window, buyers get payment + seller collateral |
| `cancelOffer(uint256 offerId)` / `reclaimUnsold(uint256 offerId)` | frontend dashboard | Seller cancels (nothing sold) / reclaims the unsold part |
| `raiseDispute` / `resolveDispute` | frontend | Dispute flow (arbiter) |
| admin: `createMarket`, `setRealToken` | frontend admin | Set up markets, set the token at TGE |

**Events:** `OfferCreated(uint256 indexed offerId, ...)` (the frontend reads the id from it), plus events for buy, deliver, default, cancel and dispute.

## BrokerRegistry (optional)

| Function | Used by | Purpose |
|---|---|---|
| `setBroker(address broker, uint64 expiry)` | backend (ENS → Arc sync) | Mirror a broker's ENS license on Arc |
| `isActiveBroker(address) view returns (bool)` | OTCMarket, frontend | Block deals by revoked or expired brokers |
