# Pre Settle × ETHGlobal Mumbai: Build Plan (Arc + Arkiv + ENSv2)

> One plan for building Pre Settle **fresh during ETHGlobal Mumbai** and submitting it to **Arc**, **Arkiv** and **ENS**.
> It is based on the sponsor prize pages and developer docs, **re-checked against the docs and contract source on 2026‑11‑06** (see §18 Verification log). The only item still marked **⚠** is a judgment call to ask the sponsor about at their booth. Everything else is confirmed.

---

## 0. TL;DR

| Pick | Prize | Pool | What Pre Settle shows for it |
|---|---|---|---|
| **1. Arc** | **Best Smart Contracts with Advanced Stablecoin Logic, in Arc Studio** | $3,000 | USDC/EURC **conditional escrow**: OTC + premarket with **automatic release**, an **on‑chain dispute**, **multi‑step settlement** and **fee splitting**, built on a **reusable** `ConditionalEscrow` |
| **2. ENS** | **Best Use of ENSv2** | **$7,000** (1st $3k · 2nd $2k · 3rd $1k · 3rd $1k) | **Verified broker identities** as ENSv2 subnames (`ravi.presettle.eth`): **non‑transferable, expiring, revocable**, each with its **own Permissioned Resolver** where the broker can edit **only** `presettle.prefs` (Enhanced Access Control) |
| **3. Arkiv** | **Build on Arkiv (from scratch)** | $4,000 (1st $3k · 2nd $1k) | **Open order book**: wallet‑owned order, offer, broker‑link, fill and profile entities that **expire at their deadline**, queried with typed filters |
| Bonus | **Arkiv + Swarm (from scratch)** | $500 (does **not** use one of your 3 picks) | Deal term sheet PDF on Swarm, referenced from the Arkiv order entity (optional) |

- **ETHGlobal allows 3 partner‑prize picks.** Arkiv's prizes count as **one** pick, and the Swarm bonus is on top.
- **Best case (1st everywhere):** $3,000 + $3,000 + $3,000 + $500 = **$9,500**, plus finalist prizes if you reach the top 10.
- **Chains:** money on **Arc Testnet (5042002)**, listings on **Arkiv Rabdi (7794095)**, identity on **Ethereum Sepolia (11155111)**.
- **Start here:** §13 Hour‑0 checklist → §6 Arc Studio prompt.

---

## 1. Ground rules

1. **All code is written during the hackathon.** Start a **new repo**. Use the old `SettleX-Frontend` / `SettleX-backend` only as a **reference** for business logic. Don't copy code in.
2. **Commit steadily.** Several sponsors check history, and Arc and Arkiv judges will look at the repo.
3. **Disclose AI usage** in the README. Both ETHGlobal and Arkiv require it, and Arc Studio itself is an AI agent.
4. **Open‑source license** (MIT) in the repo root. Arkiv requires this.
5. **Live demo link.** ENS requires one, so deploy the frontend (e.g. Vercel).

---

## 2. How the prizes are judged

### 2.1 ETHGlobal finalist (top 10)
ETHGlobal's usual finalist criteria: **Technicality, Originality, Practicality, Usability (UI/UX), WOW factor**.
Pre Settle's strongest pitch is one sentence:
> *"Trustless OTC and pre‑launch trading: money settles in USDC escrow on Arc, identities are verified ENSv2 names, and the order book is open data on Arkiv that nobody, not even us, can secretly edit."*

### 2.2 Arc: Advanced Stablecoin Logic

**What they want (from the prize page):**
- Write, test and deploy contracts **in Arc Studio** that show advanced programmable USDC/EURC logic: *conditional flows, onchain automation, multi‑step settlement*.
- Then connect them to a web or mobile app.
- Their examples:
  - *"Conditional escrow with onchain dispute and automatic release"* → **this is Pre Settle**
  - *"Treasury management and payment splitting"* → **the Pre Settle fee split**
  - *"Crosschain conditional transfer"* → optional stretch
- **Bonus:** *contracts designed to be reused by other builders* → `ConditionalEscrow`.

**Evaluated on:**

| Requirement | What you deliver |
|---|---|
| Built in Arc Studio: **shareable project URL**, and **Studio shown in the demo** | Start the contracts in Studio (§6). Put the URL in the README and the submission. |
| Functional MVP + **architecture diagram**: **working frontend AND backend** | React app + slim Node backend (§9) + the diagram in §4 |
| Video + presentation: core functions + use of Arc Studio and **Circle dev tools**, with **detailed documentation** | Video (§14) + README + `docs/` |
| GitHub repo link | Public repo |
| **State which bounty** | In the submission text: *"Arc: Best Smart Contracts with Advanced Stablecoin Logic"* |

> ⚠ **Ask at the Arc booth:** the bounty text says *"connect them to a web or mobile app … without leaving Studio."* Confirm that it's OK to pull the Studio artifacts (`arc-studio pull`) into your repo and extend the frontend there for Arkiv and ENS. If they want the app built inside Studio, have Studio generate the base app and add Arkiv and ENS on top.

### 2.3 ENS: Best Use of ENSv2

**Qualification:**
- Built on **ENSv2, Ethereum mainnet or Sepolia**. Use **Sepolia**: mainnet ENSv2 is deployed but *"until the launch completes, mainnet resolution and registrations still use the ENSv1 contracts"*.
- **ENSv2 features must be central, not cosmetic.**
- A functional demo with nothing hard‑coded.
- A **live demo link**.
- Open source.

**Features they highlight:** hierarchical registry (your own subname registry), **Enhanced Access Control** (*"delegating specific rights (e.g., editing only certain text records)"*), **Permissioned Resolver**, aliasing, and subname types (*expiring, revocable, transferable / non‑transferable*).

**What makes Pre Settle "central":** a deal **cannot proceed** unless the broker's ENSv2 name is `REGISTERED` and not expired. When the platform **revokes** (`unregister`) a broker, the UI blocks deals (Level 2: the Arc contract blocks them too). Show this live.

### 2.4 Arkiv: Build on Arkiv (from scratch)

**Judged 25% each:**

| File | Questions |
|---|---|
| `/arkiv/friction.md` | What should Arkiv improve? For anything that broke: what you expected, what happened, how to reproduce it |
| `/arkiv/reach.md` | Who is it for? Would they use it? Can they try it today? Will you keep building after Mumbai? |
| `/arkiv/why-arkiv.md` | What would users lose on Postgres? What did you keep **off** Arkiv, and why? |
| `/arkiv/how-you-use-arkiv.md` | Do your filters, edit rights and expiries fit the app? Does each Arkiv feature change something users see? |

**Qualification:**
- Writes to the **current testnet** via `@arkiv-network/sdk` or JSON‑RPC.
- **At least one user‑visible feature reads from Arkiv.**
- README lists the **wallet address(es) that wrote entities** plus **one query judges can run**.
- `/arkiv/schema.md` + `/arkiv/friction.md` + one file per criterion.
- Open‑source license + AI‑usage statement.

**Not counted:** installing the SDK without reading from it, or using Arkiv as a log nothing reads.

Their own idea list includes ***"Markets: listings or offers that expire at their deadline"*** and ***"profiles … keyed by ENS names"***. Pre Settle is both.

### 2.5 Arkiv + Swarm bonus ($500, optional)
- Use **both** Arkiv and Swarm meaningfully, e.g. user‑visible files on Swarm linked from Arkiv entities.
- `/arkiv/swarm.md` must list:
  - what lives on Swarm vs Arkiv, and **which entity field holds the Swarm reference**
  - one entity key + its Swarm reference, with a link
  - the **postage stamp batch ID** + the wallet that bought it + the Bee node or service used
  - the upload and read code files
  - run steps
  - the **demo video timestamp**
  - obstacles
- **Never put an encrypted Swarm reference into a public entity as‑is.** It contains its own decryption key.

---

## 3. Product scope for the hackathon

### In scope (MVP)

| Feature | Chains used |
|---|---|
| **OTC**: create order (escrow offer token) → partial or full fills → cancel → auto‑refund after the deadline | Arc + Arkiv |
| **Premarket**: seller creates an offer (locks USDC/EURC collateral) → buyers contribute → TGE → seller delivers **or** buyers claim the penalty → dispute window | Arc + Arkiv |
| **Fee split** on every settlement: maker / **broker** / platform (pull‑payments) | Arc |
| **Verified brokers**: ENSv2 subname issue / revoke / expiry, broker edits only `presettle.prefs` | Sepolia + backend |
| **Broker deal links** that expire in 10 minutes | Arkiv (+ Arc) |
| Open **order book** with filters (token, side, price range, verified‑broker only) | Arkiv |
| Trader profile + fill history | Arkiv (+ ENS name) |

### Out of scope (drop from the old Pre Settle)
- The Li.Fi swap page
- The Equity page
- The CoinMarketCap 12‑hour cron
- Monad
- MongoDB as the order book
- The old unauthenticated write APIs

### Old code → new design (reference only)

| Old Pre Settle | New |
|---|---|
| `OTC addTrade/executeTrade` (no cancel) | `OTCMarket` with `cancel`, deadline expiry, fee split |
| `Premarket createOffer/contributeToOffer/distribute*/distributeAfter24Hours*` | `PremarketMarket` state machine + dispute + automatic `settle` |
| `getLastAddedTradeIndex` (race condition) | Read `orderId` from the **event** in the receipt |
| Mongo `trade`, `activity`, `broker_link`, `premarket_*`, `users` | **Arkiv entities** (§7) |
| ENS v1 reads (name, avatar, `presettle.prefs`) | **ENSv2** registry + per‑broker Permissioned Resolver + EAC (§8) |
| Admin = `owner()` check + spoofable `wallet_address` body field | Contract `Ownable`/roles + backend **SIWE** auth |

---

## 4. Architecture

```
                         ┌───────────────────────────────────────────────┐
                         │   FRONTEND  (React + Vite + wagmi + RainbowKit)│
                         │   chains: arcTestnet · rabdi · sepolia         │
                         └───┬────────────────┬───────────────────┬───────┘
          USDC/EURC money    │  listings/fills│ identity           │ verified data
          (lock/fill/settle) │  profiles      │ (resolve, prefs)   │
                             ▼                ▼                    ▼
 ┌────────────────────────────┐ ┌───────────────────────────┐ ┌──────────────────────────┐
 │ ARC TESTNET (5042002)      │ │ ARKIV RABDI (7794095)     │ │ SEPOLIA (11155111) ENSv2 │
 │ ConditionalEscrow (reusable)│ │ presettle.otc_order  ⏱deadline│ │ presettle.eth              │
 │ OTCMarket                  │ │ presettle.pm_offer   ⏱TGE+win │ │  └ UserRegistry          │
 │ PremarketMarket            │ │ presettle.broker_link⏱10 min  │ │     ├ ravi  (broker)     │
 │ BrokerRegistry (Level 2)   │ │ presettle.fill       ⏱90 days │ │     └ alice (trader)     │
 │ MockPreToken (demo "XYZ")  │ │ presettle.profile    ⏱180 days│ │ per-broker               │
 │ USDC 0x3600…0000 (6 dec)   │ │ presettle.token (admin-only)  │ │  PermissionedResolver    │
 └─────────────▲──────────────┘ └────────────▲──────────────┘ └────────────▲─────────────┘
               │ events / views              │ query/verify               │ issue/revoke/renew
               └──────────────┬──────────────┴────────────────────────────┘
                     ┌────────┴──────────────────────────────┐
                     │ BACKEND (Node + viem, slim)           │
                     │ • /orders: Arkiv query + Arc verify   │
                     │ • broker issue/revoke (platform key)  │
                     │ • ENS→Arc broker sync (Level 2)       │
                     │ • keeper: auto settle() after deadline│
                     │ • SIWE admin auth                     │
                     └───────────────────────────────────────┘
```

### What lives where, and why (reuse this table in `why-arkiv.md`)

| Data | Where | Why |
|---|---|---|
| Locked funds, fills, settlement, penalties, fees | **Arc** | Money needs escrow guarantees, and Arc settles in USDC with sub‑second finality |
| Orders, offers, broker links, fills, profiles, token list | **Arkiv** | Wallet‑owned, publicly queryable, **self‑expiring**, editable only by the owner |
| Broker / trader identity, verification status, prefs | **ENSv2** | A portable identity that other apps and wallets understand |
| Emails, Telegram, private notes | **Nowhere public** | Arkiv and ENS data are public |
| Live prices | Backend memory | Changes every second, so it doesn't belong in storage |

---

## 5. Repo structure

```
presettle/
├── contracts/                 # Arc Studio output (Foundry), pulled with `arc-studio pull`
│   ├── src/ConditionalEscrow.sol
│   ├── src/OTCMarket.sol
│   ├── src/PremarketMarket.sol
│   ├── src/BrokerRegistry.sol        # Level 2
│   ├── src/mocks/MockPreToken.sol
│   └── test/…
├── ens/                       # Sepolia ENSv2 setup scripts (viem)
│   ├── 01-register-parent.ts
│   ├── 02-deploy-registry.ts
│   ├── 03-issue-broker.ts
│   ├── 04-revoke-broker.ts
│   └── abis/
├── frontend/                  # React + Vite + wagmi + RainbowKit
├── backend/                   # Node + viem (+ express)
├── scripts/
│   ├── arkiv-seed-tokens.ts   # admin token list → Arkiv
│   └── arkiv-query.ts         # "one query judges can run"
├── arkiv/
│   ├── schema.md  friction.md  reach.md  why-arkiv.md  how-you-use-arkiv.md
│   └── swarm.md               # only if you do the bonus
├── docs/architecture.png      # Arc requirement
├── README.md                  # links, addresses, query, AI usage, bounty names
└── LICENSE                    # MIT
```

---

## 6. Part A: Arc contracts in Arc Studio

### 6.1 Arc facts that affect the code

| Item | Value / rule |
|---|---|
| Arc Testnet | chain ID **5042002**, RPC `https://rpc.testnet.arc.io`, WS `wss://rpc.testnet.arc.io`, explorer `https://explorer.testnet.arc.io`, faucet `https://faucet.circle.com` |
| Gas token | **USDC** (native, **18 decimals**). Users only need USDC, for both gas and trading. |
| USDC ERC‑20 | `0x3600000000000000000000000000000000000000`, **6 decimals**. Use this interface in contracts. |
| EURC (testnet) | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`, 6 decimals |
| Permit2 / Multicall3 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` / `0xcA11bde05977b3631167028862bE2a173976CA11` |
| **Never mix** `msg.value` (18 dec) with `USDC.balanceOf` (6 dec) | Contracts take **no native value**. Use ERC‑20 `transferFrom` only, and always call `decimals()`. |
| `block.timestamp` is **non‑decreasing**, not strictly increasing (1‑second granularity) | Time checks use `>=` / `<`. Never assume each block has a later time. |
| **Blocklist**: transfers to or from blocklisted addresses revert | Pay fees with **pull‑payments** (credit + `withdraw`), so one blocklisted fee receiver can't freeze a settlement |
| Value transfer to `address(0)` reverts | Never "burn" by sending to zero |
| `maxFeePerGas` floor **20 gwei**; lower transactions are **silently dropped** | If a transaction "disappears", set `maxFeePerGas >= 20 gwei` |
| `PREVRANDAO` = 0 | No on‑chain randomness, which Pre Settle doesn't need |
| Finality | Final on inclusion, so wait for **1 confirmation** |
| Local testing | Plain `anvil` doesn't behave like Arc. Use **Arc Foundry** `arc-anvil --network arc`. |

### 6.2 Contract design

#### `ConditionalEscrow.sol` (abstract, reusable; earns the "reusable" bonus)
A generic module that any builder can inherit:

```solidity
enum EscrowState { None, Locked, Released, Refunded, Disputed, Resolved }
enum Ruling { None, ReleaseToPayee, RefundToPayer, Split }

struct Escrow {
    address payer;
    address payee;
    IERC20  token;            // USDC / EURC / any ERC-20
    uint256 amount;
    uint64  releaseAfter;     // payee may claim after this (if condition met)
    uint64  refundAfter;      // payer may reclaim after this (automatic release)
    uint64  disputeUntil;     // disputes allowed until this time
    EscrowState state;
}

// internal API used by markets
function _lock(Escrow memory e) internal returns (uint256 escrowId);
function _release(uint256 id) internal;           // CEI + SafeERC20
function _refund(uint256 id) internal;
function raiseDispute(uint256 id, bytes32 reasonHash) external;    // payer or payee, before disputeUntil
function resolveDispute(uint256 id, Ruling r, uint16 payeeBps) external; // onlyArbiter
function settleExpired(uint256 id) external;      // ANYONE: automatic release/refund by time rules
// hook for subclasses: condition check
function _conditionMet(uint256 id) internal view virtual returns (bool);
event EscrowLocked(uint256 indexed id, address payer, address payee, address token, uint256 amount);
event EscrowReleased(uint256 indexed id); event EscrowRefunded(uint256 indexed id);
event DisputeRaised(uint256 indexed id, address by, bytes32 reasonHash);
event DisputeResolved(uint256 indexed id, Ruling ruling, uint16 payeeBps);
```

If the arbiter doesn't rule within `arbiterTimeout`, a **default ruling** applies through `settleExpired`. This is the *"onchain dispute and automatic release"* from the bounty text.

#### `OTCMarket.sol`
```solidity
struct Order {
  address maker; IERC20 offerToken; uint256 offerAmount; // escrowed
  IERC20 wantToken; uint256 wantAmount;                  // total price
  uint256 filledOffer; bool partialAllowed;
  uint64 deadline; address privateTaker;                 // broker deal → only the client
  address broker; uint16 brokerFeeBps; bool cancelled;
}
function createOrder(CreateParams calldata p) external returns (uint256 orderId); // pulls offerToken
function fill(uint256 orderId, uint256 offerAmountToBuy) external;  // pro-rata wantAmount, splits fees
function cancel(uint256 orderId) external;           // maker: refund unfilled
function expire(uint256 orderId) external;           // ANYONE after deadline: refund unfilled to maker
function getOrder(uint256 orderId) external view returns (Order memory);
function withdraw(IERC20 token) external;            // pull-payment for fees/proceeds
event OrderCreated(uint256 indexed orderId, address indexed maker, address offerToken, address wantToken,
                   uint256 offerAmount, uint256 wantAmount, uint64 deadline, address broker, address privateTaker);
event OrderFilled(uint256 indexed orderId, address indexed taker, uint256 offerAmount, uint256 wantAmount);
event OrderCancelled(uint256 indexed orderId); event OrderExpired(uint256 indexed orderId);
```

**Fee split on each fill:**
- platform fee: `platformFeeBps` (admin‑set, capped e.g. ≤ 100 = 1%)
- broker fee: `brokerFeeBps` (capped e.g. ≤ 200)
- the maker receives the rest

All three are **credited** to balances and paid out through `withdraw`.

#### `PremarketMarket.sol`
The real token **doesn't exist before TGE**, so a market is created with a *placeholder* and the real token address is set at TGE.

```solidity
struct PreMarket { string symbol; uint64 tge; uint64 deliveryWindow; IERC20 realToken; bool active; }
struct Offer {
  uint256 marketId; address seller; IERC20 collateralToken;     // USDC or EURC
  uint256 tokenAmount; uint256 pricePerToken;                    // in collateral units (6 dec)
  uint256 sellerCollateral;                                      // = tokenAmount * price (100%)
  uint256 sold;                                                  // tokens sold to buyers
  Status status;                                                 // Open, Delivered, Defaulted, Cancelled, Disputed, Voided
}
function createMarket(string symbol, uint64 tge, uint64 deliveryWindow) external onlyOwner;
function setRealToken(uint256 marketId, IERC20 token) external onlyOwner;   // at TGE
function createOffer(uint256 marketId, IERC20 collateral, uint256 tokenAmount, uint256 price) external; // locks seller collateral
function buy(uint256 offerId, uint256 tokenAmount) external;      // buyer locks payment (before TGE)
function deliver(uint256 offerId) external;                       // seller, TGE..TGE+window: sends real tokens → buyers;
                                                                  // seller gets payments + collateral back − fees
function claimDefault(uint256 offerId) external;                  // ANYONE after TGE+window if not delivered:
                                                                  // buyers get payment + pro-rata seller collateral
function cancelOffer(uint256 offerId) external;                   // seller, only if sold == 0
function reclaimUnsold(uint256 offerId) external;                 // seller after TGE: collateral for unsold part
function raiseDispute(uint256 offerId, bytes32 reason) external;  // e.g. "TGE cancelled by project"
function resolveDispute(uint256 offerId, Ruling r) external onlyArbiter; // VOID = refund everyone
```

**Demo tip:** `deliveryWindow` is set **per market**. Use **3–5 minutes** in the demo, not 24 hours, so judges see the whole lifecycle including a default.

**Scope note:** the MVP supports **seller‑created offers only**. The old Pre Settle's buy/sell direction was confusing. Buyer‑created bids are a stretch goal.

#### `BrokerRegistry.sol` (Level 2: makes ENS revocation enforce on Arc)
```solidity
mapping(address => uint64) public brokerExpiry;   // 0 = not a broker
function setBroker(address broker, uint64 expiry) external onlyRelayer; // mirrored from ENS by backend
function isActiveBroker(address b) public view returns (bool) { return brokerExpiry[b] > block.timestamp; }
```
`OTCMarket.createOrder` requires `isActiveBroker(p.broker)` when `p.broker != address(0)`, and `fill` re‑checks it.

#### `MockPreToken.sol`
A simple mintable ERC‑20 ("XYZ") that plays the token launching at TGE in the demo.

### 6.3 Security checklist (put it in the README)
- `ReentrancyGuard` on all external state‑changing functions; checks‑effects‑interactions; `SafeERC20`.
- Pull‑payments for fees (protects against the Arc blocklist).
- No native value accepted (`receive` reverts).
- Caps on fee bps; `Ownable2Step` for admin; an `arbiter` role separate from the owner.
- Time comparisons use `>=` (Arc timestamps can repeat).
- Rounding favors the escrow: compute buyer payments with `mulDiv` and round **up** what buyers pay.
- Events for every state change. The frontend and backend read IDs **from events**.

### 6.4 Tests (Studio writes them; make sure these exist)

| Area | Tests |
|---|---|
| OTC | full fill · partial fills · fill after deadline reverts · cancel refunds remaining · `expire` by a stranger · fee split sums exactly · private taker enforced · inactive broker rejected (L2) |
| Premarket | buy before TGE · deliver inside the window pays everyone · deliver before TGE or after the window reverts · `claimDefault` after the window gives buyers payment + collateral · cancel only when nothing is sold · `reclaimUnsold` · dispute VOID refunds everyone · arbiter timeout → default ruling |
| Escrow | double release/refund reverts · reentrancy attempts · EURC as collateral |

### 6.5 Arc Studio: step by step
1. **Web workspace:** go to `https://studio.arc.io`, log in, and create the project. Paste the prompt in §6.6.
2. Let Studio **write → test → audit → deploy to Arc Testnet**. Keep iterating in Studio until all tests pass. **Screen‑record a few minutes now**, because the demo must show Studio.
3. **Copy the shareable project URL** into the README (required).
4. **Get the code into your repo:**
   - Install the CLI (the user does this; it opens a browser for login):
     ```bash
     npm install -g @circle-fin/arc-studio-cli
     arc-studio skills install --tool claude-code   # optional: drive Studio from Claude Code
     arc-studio login
     arc-studio agent-guide
     arc-studio pull        # retrieves the generated artifacts
     ```
   - Studio runs in its own sandbox and **doesn't edit your local repo**. Send files to it with `--file`, and bring results back with `pull`.
5. Record the **deployed addresses** in `contracts/deployments/arc-testnet.json` and the README.

### 6.6 The Arc Studio prompt (paste this)
```
Build "Pre Settle": trustless OTC and pre-launch (premarket) trading settled in stablecoins on Arc Testnet.
Use Foundry, Solidity ^0.8.24, OpenZeppelin (SafeERC20, ReentrancyGuard, Ownable2Step).

ARC RULES: use the USDC ERC-20 interface 0x3600000000000000000000000000000000000000 (6 decimals) and
EURC 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a (6 decimals). Never accept native value (msg.value);
never mix native 18-decimal USDC with ERC-20 6-decimal USDC. Time checks must tolerate equal
block.timestamp across blocks (use >=). Pay out fees and proceeds with pull-payments (credit + withdraw)
because Arc blocklisted addresses make transfers revert.

CONTRACTS:
1) ConditionalEscrow (abstract, reusable by other builders): escrow struct {payer, payee, token, amount,
   releaseAfter, refundAfter, disputeUntil, state}; internal _lock/_release/_refund; external raiseDispute
   (payer or payee before disputeUntil), resolveDispute (arbiter: ReleaseToPayee | RefundToPayer | Split bps),
   settleExpired (anyone; applies time rules and a default ruling if the arbiter does not rule within
   arbiterTimeout); virtual _conditionMet hook; events for every transition. Document it as a reusable module.
2) OTCMarket: createOrder (escrows offer token; params: wantToken, wantAmount, partialAllowed, deadline,
   optional privateTaker, optional broker + brokerFeeBps), fill (partial/full, pro-rata price using mulDiv,
   rounding in favor of the maker), cancel (maker refunds unfilled), expire (anyone after deadline refunds
   unfilled to maker), getOrder view, withdraw. Fee split on each fill: platformFeeBps (owner-set, max 100),
   brokerFeeBps (max 200), rest to maker, all credited. Emit OrderCreated(orderId,...) with the id.
3) PremarketMarket: owner createMarket(symbol, tge, deliveryWindow) and setRealToken at TGE. Seller
   createOffer(marketId, collateralToken USDC/EURC, tokenAmount, pricePerToken) locks 100% collateral.
   Buyers buy(offerId, amount) before TGE (lock payment). Seller deliver(offerId) between TGE and
   TGE+deliveryWindow: transfers real tokens to every buyer pro-rata; seller receives payments + collateral
   minus platform fee. If not delivered by TGE+deliveryWindow, anyone can call claimDefault: each buyer gets
   payment back plus pro-rata share of seller collateral. cancelOffer only if nothing sold. reclaimUnsold after
   TGE for the unsold collateral. raiseDispute (e.g. TGE cancelled) and arbiter resolveDispute with VOID
   (refund everyone) / FOR_BUYERS / FOR_SELLER; arbiter timeout -> default rule.
4) BrokerRegistry: relayer-set mapping broker => expiry; OTCMarket must require isActiveBroker for orders that
   name a broker, and re-check on fill.
5) MockPreToken: mintable ERC-20 "XYZ" used as the real token at TGE in demos.

TESTS: full + partial fills, deadline expiry by a stranger, cancel, exact fee split sums, private taker,
inactive broker rejected, premarket deliver inside window, deliver outside window reverts, claimDefault payout
math, cancel rules, reclaimUnsold, dispute VOID refunds all, arbiter timeout default, reentrancy, EURC collateral.
Deploy everything to Arc Testnet and output the addresses and ABIs. Then build a minimal web app wired to them
(create order, fill, cancel, create premarket offer, buy, deliver, claimDefault).
```

### 6.7 Circle tools to mention (the Arc video is judged on "use of Circle's developer tools")
- **USDC as the gas and settlement asset**: users only ever hold USDC.
- **EURC** as alternative collateral, for EUR‑priced deals.
- **Arc Studio** to write, audit, test and deploy.
- **Stretch:** "fund with USDC from any chain" using the **App Kit Bridge (CCTP; Arc is CCTP domain 26)**. Only add it if everything else works.

---

## 7. Part B: Arkiv (open order book)

### 7.1 Arkiv facts

| Item | Value / rule |
|---|---|
| Testnet "Rabdi" | chain ID **7794095**, RPC `https://rpc.rabdi.db-chain.testnet.arkiv.network`, WS `wss://rpc.rabdi.db-chain.testnet.arkiv.network`, explorer `https://rabdi.explorer.arkiv.network`, indexer `https://indexer.rabdi.db-chain.testnet.arkiv.network` |
| Gas | **tGLM** from `https://hub.arkiv.network/faucet` |
| Access key | Free at `https://hub.arkiv.network/access-keys`; one key per wallet per network, with a monthly quota. It **only raises rate limits; it does not authorize writes for users.** `rabdi({ accessKey })` appends it to the RPC URLs. Omitting `accessKey` throws `MissingAccessKeyError`; `""` falls back to the public RPC with a warning. **Browser:** set **Origins** (the docs say this is attribution, not real access control). **Server:** use the **IP allowlist** (real access control). **Never add a chain containing your key to a user's wallet.** |
| SDK | `@arkiv-network/sdk` + `viem` (Node 22.10+ or Bun) |
| Schema | `defineSchema(name, columns)` from `@arkiv-network/sdk/schema`. Use `.indexed()` only on filter columns (indexes cost on every write); `bytes` can't be indexed; `.optional()` / `.default()` |
| **Column types (9)** | `bool i32 u64 u256 dec str addr key bytes`. **Writing values:** plain JS works for `bool` (boolean), `i32` (number), `u256` (bigint), `str` (string), `bytes` (Uint8Array). **Wrap the rest:** `dec("4.5")` (a string; `dec(0.1)` throws), `u64(5n)` (a bare `5n` is a u256), `addr("0x…")` (mixed case must be a valid checksum), `key(entityKey)`. **Reading:** `row.col.value`. `u64`/`u256` come back as bigint, `dec` as a string, `addr` checksummed. |
| Named schema | Adds an indexed `arkiv.schema` tag. **This is not a security boundary.** Always filter with `ownedBy` / `createdBy`. Rows that don't match the schema are skipped by default (counted in `page.skipped`), or use `.from(S, { onMismatch: "throw" })`. |
| Expiry | `ExpirationTime` (import from `"@arkiv-network/sdk"`): `fromMinutes/Hours/Days/Weeks/Months/Blocks`, **`atDate(date, { atLeast? })`**, `max()`. Blocks are 2 s, so `fromSeconds` must be a multiple of 2. Max lifetime ~**182.5 days** (`MAX_LIFETIME`). `extendEntity` counts **from now**, not from the old expiry. **No event fires at expiry**; the entity simply disappears from queries. |
| Create flags | `flags: { readonly: true }` makes attributes immutable forever (use it for `fill` records). `permissionlessExtension: true` lets anyone extend. |
| Edit rights | **Only the owner** can `patchEntity` / `deleteEntity` / `extendEntity` / `changeOwnership`. `$creator` never changes. Non‑owner attempts throw `EntityMutationError`. |
| Batch | `executeBatch({ creates, patches, extensions, ownershipChanges, deletes })` is **atomic** (all or nothing); `result.createdEntities` lists the new keys in order. |
| Limits | 32 attributes per entity (31 when named) · `str` ≤ 128 bytes · `bytes` ≤ 128 KiB · **100 rows per page** (`limit` must be 1–100) · `dec` has 18 decimals |
| Filters | `eq ne gt gte lt lte between exists hasType` (+ `startsWith` for `str` only) combined with `and` / `or` / `not`, plus the system fields `$key $owner $creator $expiresAt`. Selectable system fields: `$key $owner $creator $createdAt $updatedAt $expiresAt $creationFlags`. |

### 7.2 Schemas (`frontend/src/arkiv/schemas.ts`, shared with the backend)
```ts
import { defineSchema, str, addr, dec, u64, bool, bytes } from "@arkiv-network/sdk/schema"

export const OtcOrder = defineSchema("presettle.otc_order.v1", {
  maker:      addr().indexed(),
  side:       str().indexed(),        // "sell" | "buy"
  offerToken: addr().indexed(),
  wantToken:  addr().indexed(),
  price:      dec().indexed(),        // wantToken per 1 offerToken (human units)
  amount:     dec(),                  // offer amount (human units)
  partial:    bool().indexed(),
  orderId:    u64().indexed(),        // on-chain id from OrderCreated event
  deadline:   u64().indexed(),
  broker:     addr().optional(),
  brokerEns:  str().optional(),       // e.g. "ravi.presettle.eth"
  makerEns:   str().optional(),
  arcTx:      str(),                  // tx hash (66 chars, fits in 128 bytes)
  termsRef:   str().optional(),       // Swarm reference (bonus) — NEVER an encrypted ref
})

export const PremarketOffer = defineSchema("presettle.pm_offer.v1", {
  seller: addr().indexed(), marketId: u64().indexed(), symbol: str().indexed(),
  collateralToken: addr().indexed(), price: dec().indexed(), tokenAmount: dec(),
  offerId: u64().indexed(), tge: u64().indexed(), arcTx: str(),
})

export const BrokerLink = defineSchema("presettle.broker_link.v1", {
  broker: addr().indexed(), client: addr().indexed(), brokerEns: str(),
  offerToken: addr(), wantToken: addr(), price: dec(), amount: dec(), feeBps: u64(),
})

export const Fill = defineSchema("presettle.fill.v1", {
  market: str().indexed(),            // "otc" | "premarket"
  refId: u64().indexed(),             // orderId / offerId
  orderKey: str().optional(),         // Arkiv $key of the order entity
  taker: addr().indexed(), maker: addr().indexed(),
  amount: dec(), price: dec(), arcTx: str(),
})

export const Profile = defineSchema("presettle.profile.v1", {
  ens: str().indexed(), prefTokens: str().optional(), minSize: dec().optional(), bio: bytes().optional(),
})

export const Token = defineSchema("presettle.token.v1", {   // written ONLY by the admin wallet
  kind: str().indexed(),             // "otc" | "premarket" | "collateral"
  address: addr().indexed(), symbol: str().indexed(), decimals: u64(), logo: str().optional(),
})
```
> ✅ Value rules confirmed in the column‑types docs: `bool` and `str` take plain values; `dec("…")`, `u64(…n)` and `addr("0x…")` must be wrapped. Create `Fill` entities with `flags: { readonly: true }` so trade history can never be edited.

### 7.3 Expiry rules (core of `how-you-use-arkiv.md`)

| Entity | Owner | Expires | Why |
|---|---|---|---|
| `otc_order` | maker | `ExpirationTime.atDate(new Date(deadline*1000))` | A listing must vanish when the on‑chain deadline passes |
| `pm_offer` | seller | `atDate(tge + deliveryWindow)` (≤ 182 days; extend if TGE is later) | No longer needed after settlement |
| `broker_link` | broker | `ExpirationTime.fromMinutes(10)` | A broker quote must not be used at a stale price |
| `fill` | taker | `fromDays(90)` | Track record; can be extended |
| `profile` | trader | `fromDays(180)`; extend on each login | Active traders stay listed |
| `token` | **admin** | `max()` + re‑extend | A curated list, read with `createdBy(ADMIN)` |

### 7.4 Clients (`frontend/src/arkiv/client.ts`)
```ts
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk"
import { rabdi } from "@arkiv-network/sdk/chains"
import { http, custom } from "viem"

export const readChain   = rabdi({ accessKey: import.meta.env.VITE_ARKIV_ACCESS_KEY ?? "" })
export const walletChain = rabdi({ accessKey: "" })   // add THIS one to wagmi chains (keeps key out of wallets)
export const arkivPublic = createPublicClient({ chain: readChain, transport: http() })
```
Wallet client from wagmi (the docs say **don't use `window.ethereum`** in a wagmi app):
```ts
import { useWalletClient } from "wagmi"
export function useArkivWallet() {
  const { data: wc } = useWalletClient({ chainId: walletChain.id })
  return wc ? createWalletClient({ chain: walletChain, transport: custom(wc.transport), account: wc.account }) : undefined
}
```

### 7.5 Writes
```ts
import { ExpirationTime } from "@arkiv-network/sdk"          // ✅ confirmed (writing/create docs)
import { addr, dec, u64 } from "@arkiv-network/sdk/schema"

const { entityKey, txHash: arkivTx, expiresAt } = await arkivWallet.createEntity(OtcOrder, {
  maker: addr(account), side: "sell",                         // str = plain string
  offerToken: addr(order.offerToken), wantToken: addr(order.wantToken),
  price: dec(String(order.price)), amount: dec(String(order.amount)), // dec needs a STRING
  partial: order.partial,                                     // bool = plain boolean
  orderId: u64(BigInt(orderId)), deadline: u64(BigInt(order.deadline)),
  arcTx: txHash, ...(ensName ? { makerEns: ensName } : {}),  // omit optional fields
}, { expiration: ExpirationTime.atDate(new Date(order.deadline * 1000)) })
// resolves once the tx is in a block; throws EntityMutationError on failure
```
- **Fill record (immutable):** `createEntity(Fill, values, { expiration: ExpirationTime.fromDays(90), flags: { readonly: true } })`
- **Cancel:** call Arc `cancel(orderId)`, then Arkiv `deleteEntity({ entityKey })` (owner only).
- **Profile refresh:** `extendEntity({ entityKey, expiration: ExpirationTime.fromDays(180) })` (counts from now).
- **First login:** use one atomic `executeBatch({ creates: [{ schema: Profile, values, expiration }] , extensions: [...] })` call for several writes in one wallet signature.

### 7.6 Reads (the user‑visible features)
```ts
import { and, eq, lte, gte } from "@arkiv-network/sdk/query"

const { entities } = await arkivPublic
  .select({ $key: true, $owner: true, $expiresAt: true, maker: true, price: true, amount: true,
            orderId: true, deadline: true, brokerEns: true, makerEns: true })
  .from(OtcOrder)
  .where(and(eq("side", "sell"), eq("offerToken", addr(token)), lte("price", dec(maxPrice))))
  .orderBy(asc("$key")).limit(100)          // limit 1–100; use .offset(n) or key-based paging
  .fetch()
// rows: e.price.value (string), e.orderId.value (bigint), e.$owner (checksummed)
```
**Key‑based paging** (the docs recommend it for reading every match exactly once): keep `orderBy(asc("$key"))`, and for the next page add `.where(gt("$key", key(lastKey)))`. A page shorter than the limit is the last one.

| UI feature | Arkiv query |
|---|---|
| Market page | `OtcOrder` + filters (side, token, price range, `partial`) |
| "Verified brokers only" toggle | `exists("brokerEns")`, then an ENS check (§8) |
| My orders | `.from(OtcOrder).ownedBy(me)` |
| My fills / trader record | `.from(Fill).where(eq("taker", addr(x)))` |
| Broker link page `/deal/:key` | `arkivPublic.getEntity(key, BrokerLink)`. It **throws `NoEntityFoundError`** for expired, deleted or unknown keys, so catch it and show "Link expired". |
| Token dropdowns | `.from(Token).createdBy(ADMIN)` |
| "Ending soon" badge | Get the current block from `arkivPublic.getBlockTiming()`, then `lt("$expiresAt", u64(currentBlock + 1800n))` (1800 blocks × 2 s ≈ 1 hour) |
| Live updates | `const unwatch = arkivPublic.watchEntityEvents({ onEntityCreated, onEntityDeleted, onEntityPatched, onExpiryExtended, onError, pollingInterval })`. Events carry **no attributes**, so re‑read the entity. **There is no expiry event**, so re‑query on a timer to drop expired rows. Call `unwatch()` on unmount. |

### 7.7 Anti‑spoofing (write this up in `how-you-use-arkiv.md`)
Anyone can write an entity tagged `presettle.otc_order.v1`. So the **backend `/orders` endpoint and the frontend both verify** every row before showing it:
1. `entity.$owner == OTCMarket.getOrder(orderId).maker`
2. The order is not cancelled, not fully filled, and `deadline > now` on Arc.
3. If `broker` is set, the broker's ENS name is `REGISTERED` (§8).

Rows that fail are hidden. Count them for the README ("X spoofed rows filtered").

### 7.8 Two‑chain write UX and failure handling
- Creating an order means **1. Arc** (approve + `createOrder`) and then **2. Arkiv** (`createEntity`). wagmi prompts the network switch. Pre‑fund demo wallets with tGLM.
- If step 2 fails, the order still exists on Arc. The dashboard compares the maker's `OrderCreated` events with their Arkiv entities and shows **"Publish listing"** for any order that has no entity.
- Log every chain‑switch pain point in `friction.md` **as it happens**.

### 7.9 Required Arkiv files: what to write

| File | Content |
|---|---|
| `schema.md` | The 6 schemas: columns, which are indexed and why, owner, expiry rule, example `toString()` query text |
| `why-arkiv.md` | "With Postgres, the operator could silently edit, censor or front‑run listings, and only our app could read the book. With Arkiv, makers own their listings, any app or agent can read the book, and listings expire exactly at their deadline with no cron. **Kept off Arkiv:** funds (Arc escrow), private contacts (public chain), live prices (too volatile)." |
| `how-you-use-arkiv.md` | The expiry table (§7.3); owner‑only edits; the anti‑spoofing check (§7.7); `createdBy(ADMIN)` for tokens; each feature mapped to what users see (§7.6) |
| `reach.md` | Users: OTC traders, brokers, pre‑launch buyers. The live URL. Post‑Mumbai plan (mainnet when available, an aggregator API for other dApps). |
| `friction.md` | Real notes: wallet chain switching, tGLM funding, decimals and `dec`, `u64` wrappers, the 100‑row paging, no expiry events. Each with expected / actual / repro. |
| README | **Writer wallet addresses** (admin + demo makers) + a runnable query: `node --experimental-strip-types scripts/arkiv-query.ts` |

### 7.10 Swarm bonus (only if time is left)
- Upload a deal **term sheet PDF** (unencrypted, public) to Swarm.
- Store the reference in `OtcOrder.termsRef`. The order page shows "📄 Term sheet (Swarm)".
- Write `/arkiv/swarm.md` with every item listed in §2.5.

---

## 8. Part C: ENSv2 on Sepolia (verified brokers)

### 8.1 ENSv2 facts
- **Use Sepolia.** Mainnet ENSv2 isn't live for resolution yet.
- **Sepolia ENSv2 addresses:**
  | Contract | Address |
  |---|---|
  | RootRegistry | `0xb458d6a3a77919449d03e7a6903c26827c1ec43f` |
  | ETHRegistry | `0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4` |
  | ETHRegistrar | `0xf633e7fc17e2bbe0d0965d18ec1821dcb754a3d3` |
  | UniversalResolverV2 | `0x24e1d8e068620b647ca097f961a61055f4f42d72` |
  | VerifiableFactory | `0xda70306c98e97ece36f997a21368e53298572991` |
  | PermissionedResolverImpl | `0x115eb53f0c60696633855f90b138178fb40b2b2c` |
  | UserRegistryImpl | `0x9bd8a88719068d09ecee662f36c0e3856708366a` |
- **Registration fee on Sepolia** is paid in **MockUSDC `0x240b0316df57887dbbe58b586508b19e633a14aa`** (from the ENS deployments page). Anyone can call its `mint(to, amount)`; it uses 6 decimals, so 100 USDC = `100_000_000n`. Approve the ETHRegistrar first. MockDAI is `0xf6fac8a58a0be13b9197f27c41b73162fe32572b`.
- **Names are ERC‑1155 tokens** in per‑name registries. **Token IDs are mutable**, so key caches by **labelhash**.
- **Registry roles** (bigint):
  ```ts
  ROLE_REGISTRAR=1n<<0n, ROLE_REGISTER_RESERVED=1n<<4n, ROLE_SET_PARENT=1n<<8n,
  ROLE_UNREGISTER=1n<<12n, ROLE_RENEW=1n<<16n, ROLE_SET_SUBREGISTRY=1n<<20n,
  ROLE_SET_RESOLVER=1n<<24n, ROLE_CAN_TRANSFER_ADMIN=(1n<<28n)<<128n, ROLE_UPGRADE=1n<<124n
  ```
- **Resolver roles:**
  ```ts
  ROLE_SET_ADDRESS=1n<<0n, ROLE_SET_TEXT=1n<<4n, ROLE_SET_CONTENTHASH=1n<<8n, ROLE_LINK=1n<<28n
  ```
  Each role's admin counterpart is `role << 128n`.
- **Rules that drive the design:**
  - A name with **no `ROLE_CAN_TRANSFER_ADMIN`** in its registration `roleBitmap` can't be transferred (`TransferDisallowed`). That makes it a **non‑transferable license**.
  - `unregister(labelhash)` (needs `ROLE_UNREGISTER`) sets expiry to now and **burns** the token. That is **revocation**.
  - `expiry` is an absolute timestamp, and `renew` can only extend it. That gives an **expiring license**.
  - A resolver's `grantSetterRoles(encodedSetText(key), account)` lets an account set **only that text key**, but **for every name on that resolver instance**. So use **one resolver instance per broker**.
- **Libraries:** viem `getEnsAddress / getEnsText / getEnsName` with `normalize()`. The Universal Resolver address is built into viem, so **don't hard‑code it**. ENSjs **≥ 5.2.5** if you use `setRecords`. Setters take **DNS‑encoded names**:
  ```ts
  import { normalize, packetToBytes } from "viem/ens"
  import { toHex } from "viem"
  const dnsName = toHex(packetToBytes(normalize("ravi.presettle.eth")))
  ```
- **Exact registry signatures** (from `contracts-v2/contracts/src/registry/PermissionedRegistry.sol`):
  - `register(string label, address owner, IRegistry registry, address resolver, uint256 roleBitmap, uint64 expiry)`, which needs root `ROLE_REGISTRAR`. **A real owner with `roleBitmap = 0` is allowed** (only `owner == 0 && roleBitmap != 0` reverts). An expiry in the past reverts with `CannotSetPastExpiry`.
  - `unregister(uint256 anyId)`, which needs `ROLE_UNREGISTER`
  - `renew(uint256 anyId, uint64 newExpiry)`, which needs `ROLE_RENEW`
  - `setSubregistry(uint256 anyId, IRegistry registry)`, which needs `ROLE_SET_SUBREGISTRY` on that name
  - `setParent(IRegistry parent, string label)`, which needs root `ROLE_SET_PARENT`. It sets the child registry's canonical parent, and Universal Resolver V2 uses `getParent()` to verify canonical chains.

### 8.2 Name design
```
presettle.eth                         (owned by team/platform wallet, registered via ETHRegistrar)
 └─ subregistry: UserRegistry  "Pre Settle Registry"  (platform holds root roles)
      ├─ ravi.presettle.eth   owner = broker wallet, roleBitmap = 0 (no transfer, no resolver change)
      │    resolver = PermissionedResolver #ravi (owned by platform)
      │      addr(60)=broker · text presettle.role=broker · presettle.status=active
      │      presettle.maxFeeBps=200 · presettle.prefs  ← broker may edit ONLY this key
      └─ alice.presettle.eth  (optional: verified traders, same pattern, role=trader)
```

**Trust model** (say this honestly in the README): the platform keeps root roles on its registry, so the registry is **not emancipated**. That's intentional: Pre Settle is the *verifier* that issues, renews and revokes broker licenses. Brokers own their token and their `presettle.prefs`, but they can't transfer the license or repoint it.

> ✅ Confirmed in the registry source: `register(label, brokerAddr, IRegistry(0), resolver, 0, expiry)` with `roleBitmap = 0` is valid. The broker owns the ERC‑1155 token but holds no roles, so they can't transfer it (no `ROLE_CAN_TRANSFER_ADMIN`), can't change its resolver, and can't create sub‑subnames.

### 8.3 Setup scripts (`ens/`, viem, Sepolia, platform key)
1. **`01-register-parent.ts`** registers `presettle.eth`, or any free name such as `presettlemumbai.eth`:
   - mint MockUSDC → approve the ETHRegistrar
   - `makeCommitment(label, owner, secret, subregistry=0x0, resolver, duration, referrer=0x0)` → `commit`
   - wait **≥ 60 s** (the commitment must be used within 24 h) → `register(label, owner, secret, 0x0, resolver, duration, MockUSDC, 0x0)`
   - The owner receives `ROLE_SET_SUBREGISTRY(+ADMIN)`, `ROLE_SET_RESOLVER(+ADMIN)` and `ROLE_CAN_TRANSFER_ADMIN`.
2. **`02-deploy-registry.ts`** deploys a **UserRegistry** proxy through the VerifiableFactory:
   - `deployProxy(USER_REGISTRY_IMPL, salt, initData)`
   - `salt = keccak256(abi.encode(keccak256("UserRegistry"), namehash("presettle.eth"), version))`
   - `initData = initialize([{account: platform, roleBitmap: ALL_ROLES}])`
   - Read `ProxyDeployed.proxyAddress` from the receipt.
   - Attach it downward: `ETHRegistry.setSubregistry(labelhash("presettle"), userRegistry)` (ETHRegistry `0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4`). The owner received `ROLE_SET_SUBREGISTRY` at registration. Without this, names *"mint tokens but never resolve."*
   - Link it upward: `userRegistry.setParent(ETHRegistry, "presettle")`. The platform holds `ROLE_SET_PARENT` through `ALL_ROLES`. This sets the canonical parent that the Universal Resolver checks with `getParent()`.
   - Point `presettle.eth` at a resolver: `ETHRegistry.setResolver(...)` or set it at registration. Then verify with `getEnsAddress({ name: "presettle.eth" })` on Sepolia.
3. **`03-issue-broker.ts {label} {brokerAddr} {days}`**:
   1. Deploy a **PermissionedResolver** proxy for this broker:
      - salt = `keccak256(abi.encode(keccak256("OwnedResolver"), platform, version=<unique per broker>))`
      - `initialize(grants=[{platform, ALL_ROLES}], calls=[setAddress(name,60,broker), setText(name,"presettle.role","broker"), setText(name,"presettle.status","active"), setText(name,"presettle.maxFeeBps","200")])`
   2. Delegate exactly one key. Only the selector and key in the encoded setter matter; the name and value are ignored, so `"0x"` / `""` is fine (pattern from the ENS docs):
      ```ts
      const setter = encodeFunctionData({ abi: permissionedResolverAbi, functionName: "setText",
                                          args: ["0x", "presettle.prefs", ""] })
      await platform.writeContract({ address: brokerResolver, abi: permissionedResolverAbi,
                                     functionName: "grantSetterRoles", args: [setter, broker] })
      ```
      The broker can now call `setText(dnsName, "presettle.prefs", json)`. Any other key reverts with `EACUnauthorizedAccountRoles`. The delegation is per resolver instance, which is exactly why each broker gets their own.
   3. `UserRegistry.register("ravi", broker, zeroAddress, brokerResolver, 0n, BigInt(now + days*86400))`
   4. **Level 2:** call Arc `BrokerRegistry.setBroker(broker, expiry)`.
4. **`04-revoke-broker.ts {label}`**:
   - `UserRegistry.unregister(labelhash(label))` → status becomes `AVAILABLE`, the token is burned
   - (L2) Arc `setBroker(broker, 0)`
5. **Renew:** `UserRegistry.renew(labelhash, newExpiry)`. The platform holds `ROLE_RENEW`.

### 8.4 Frontend ENS features (what makes ENSv2 "central")

| Feature | Implementation |
|---|---|
| **Broker badge** on order cards and the deal page | `getState(labelhash)` on the Pre Settle UserRegistry → `status==REGISTERED && expiry>now`, plus `getEnsAddress(name) == order.broker` and `getEnsText(name,"presettle.status")=="active"`. Show "✓ Verified broker · license expires DD/MM". |
| **Deal gate** | If the badge check fails, the **Approve deal button is disabled** with "Broker license revoked/expired". On Level 2 the Arc contract also reverts. |
| **Broker console** (`/broker/profile`) | The broker connects on Sepolia and edits `presettle.prefs` (JSON: tokens, min size, hours) with `setText` on **their** resolver. Trying to edit `presettle.status` **fails with `EACUnauthorizedAccountRoles`**. Show this in the demo: it proves Enhanced Access Control. |
| **Prefs matching** | The market highlights orders matching the connected broker's or trader's `presettle.prefs` |
| **ENS inputs** | Any address field accepts `name.eth` (viem `getEnsAddress`) |
| **Reverse names** | Show `getEnsName(address)` for makers and takers |
| **Admin page** (`/admin/brokers`) | SIWE‑authenticated. Issue / renew / revoke through backend endpoints that run the scripts above. |

### 8.5 ENS submission text (key lines)
> "Pre Settle uses ENSv2 as its **broker licensing system**. Each broker gets a **non‑transferable, expiring, revocable** subname in our own UserRegistry, served by a **per‑broker PermissionedResolver** where Enhanced Access Control lets the broker edit **only** `presettle.prefs`, while Pre Settle controls `presettle.status`. Deals **cannot be approved** unless the broker's name is registered and unexpired, and revocation is mirrored to our Arc escrow contracts."

---

## 9. Backend (slim Node + viem)

| Endpoint / job | What it does |
|---|---|
| `GET /orders?side&token&maxPrice` | Arkiv query → verify each row on Arc (`getOrder`) + ENS (when there's a broker) → returns clean rows + `filteredSpoofed` count |
| `GET /brokers/:label` | ENS status (registry `getState`, records) |
| `POST /admin/brokers/issue` · `/renew` · `/revoke` | **SIWE**‑protected. Runs the §8.3 actions with the platform key, then (L2) syncs the Arc `BrokerRegistry`. |
| Keeper job (every 30 s) | Finds Arc orders past the deadline and premarket offers past TGE+window, and calls `expire()` / `claimDefault()` (permissionless automatic release) |
| ENS→Arc sync (L2) | Watches `LabelRegistered`, `LabelUnregistered` and `ExpiryUpdated` on the Pre Settle UserRegistry, and calls `BrokerRegistry.setBroker` |
| `GET /health` | Health check |

- **Env:** `ARC_RPC`, `SEPOLIA_RPC`, `ARKIV_ACCESS_KEY`, `PLATFORM_PK` (testnet only, never committed), contract addresses.
- **No database is needed.** Arkiv is the data layer, and you can add an in‑memory cache.

---

## 10. Frontend (React + Vite + wagmi + RainbowKit)

### 10.1 Chains
```ts
// ✅ viem ships Arc Testnet: src/chains/definitions/arcTestnet.ts (id 5042002, USDC 18-dec native,
//    explorer https://explorer.testnet.arc.io). Install a current viem: `npm i viem@latest wagmi@latest`.
import { arcTestnet, sepolia } from "viem/chains"
import { walletChain as rabdiWallet } from "./arkiv/client"   // rabdi({ accessKey: "" })

// wagmi getDefaultConfig({ chains: [arcTestnet, rabdiWallet, sepolia], ... })
```
If your installed viem has no `arcTestnet` export, upgrade viem rather than hand‑writing the chain.

### 10.2 Pages

| Route | Content |
|---|---|
| `/` | OTC market (Arkiv reads + filters + verified badges) |
| `/premarket` | Premarket offers (Arkiv) + TGE countdown + deliver / claim buttons |
| `/create` | Create OTC order or premarket offer (Arc → Arkiv) |
| `/deal/:entityKey` | Broker link (Arkiv, 10‑minute expiry) + ENS broker gate + approve (Arc) |
| `/dashboard` | My orders, offers, fills, withdrawable balances (`withdraw`) |
| `/broker/profile` | ENS prefs editor (Sepolia) |
| `/admin` | Markets/TGE (Arc), token list (Arkiv), brokers (ENS via backend) |

### 10.3 UX rules
- Every action shows **which chain** it uses: "💵 Arc", "📦 Arkiv", "🪪 ENS".
- Each card shows **"📦 Stored on Arkiv"** linking to the Arkiv explorer and **"🔒 Escrowed on Arc"** linking to the Arc explorer.
- Read the Arc `orderId` / `offerId` **from the receipt event**, never from "last index".
- USDC amounts: always ERC‑20 **6 decimals** via `decimals()`. Never use native 18‑decimal values for display or math.

---

## 11. End‑to‑end flows

**A. Create an OTC sell order (maker):** Arc `approve` → Arc `createOrder` (read `OrderCreated.orderId`) → Arkiv `createEntity(OtcOrder, …, expiration atDate(deadline))` → the card appears for everyone.

**B. Fill (taker):** browse (Arkiv) → backend verifies → Arc `approve(USDC)` → Arc `fill` (fee split credited) → Arkiv `createEntity(Fill)` → maker and broker `withdraw`.

**C. Broker deal:**
1. Admin issues `ravi.presettle.eth` (ENS) → Arc `setBroker` (L2).
2. Ravi creates a `BrokerLink` (Arkiv, 10 minutes) and shares `/deal/<key>`.
3. The client opens it and sees the ENS badge.
4. Approve → Arc `createOrder` with `privateTaker` / `broker` set.
5. Revoke Ravi → the badge turns red → Approve is disabled, and the Arc call reverts (L2).
6. After 10 minutes the link page shows "expired".

**D. Premarket:**
1. Admin `createMarket("XYZ", tge = now+3m, window = 3m)`.
2. Seller creates an offer (locks USDC) → Arkiv `PmOffer`.
3. Buyers `buy`.
4. At TGE the admin calls `setRealToken(MockPreToken)`.
5. Path 1: the seller delivers → everyone is paid.
6. Path 2 (second offer): the seller does nothing → after the window the keeper or anyone calls `claimDefault` → buyers receive payment + collateral.
7. Path 3 (optional): dispute → arbiter rules VOID → full refunds.

---

## 12. Build order and team split

| Phase | Contracts dev | Frontend dev | Backend / ENS dev | Done when |
|---|---|---|---|---|
| **H0–H2** | Arc Studio project + prompt §6.6 | Repo scaffold, wagmi chains | Faucets, keys, register `presettle.eth` | Studio URL exists, one Arkiv test entity written and read |
| **H2–H10** | Iterate contracts and tests in Studio → deploy to Arc | Create/fill/cancel UI on Arc | UserRegistry + issue/revoke scripts | Fill works end to end on Arc |
| **H10–H18** | Premarket + dispute + keeper hooks | Arkiv publish + market reads + filters | `/orders` verifier, keeper, SIWE | The market reads from Arkiv |
| **H18–H26** | BrokerRegistry (L2), bug fixes | Broker link page, ENS badge/gate, prefs editor | ENS→Arc sync, renew | Revoke blocks a deal live |
| **H26–H32** | Freeze contracts | Polish, "Stored on Arkiv" badges, deploy to Vercel | All `arkiv/*.md`, README, diagram | Live link works |
| **H32–H36** | — | Record video | Submission forms | Submitted |

**Cut lines if time runs out:**
1. Drop the Swarm bonus.
2. Drop EURC.
3. Drop Level 2 (keep the ENS gate in UI and backend only).
4. Drop disputes from OTC (keep them in Premarket).

**Never cut:**
- Arc Studio evidence
- The working core flows
- The Arkiv read feature + the md files
- The ENS revoke demo

**Solo or 2 people:** do Arc + ENS fully first, then a minimal Arkiv (orders + broker links only) if time allows.

---

## 13. Hour‑0 checklist
- [ ] New public repo + MIT `LICENSE` + first commit (note the time)
- [ ] 3–4 demo wallets (maker, taker, broker, admin). Keep the keys **testnet only**.
- [ ] **Arc:** testnet USDC from `faucet.circle.com` for every wallet (USDC is also the gas token)
- [ ] **Arc Studio:** log in at `studio.arc.io` and create the project. Optionally install the CLI (§6.5).
- [ ] **Arkiv:** tGLM from `hub.arkiv.network/faucet` for every wallet. Create an **access key** and lock it to localhost + your Vercel domain.
- [ ] **Sepolia:** ETH from a faucet for the platform and broker wallets. Mint MockUSDC for the ENS registration.
- [ ] Read: Arc `evm-differences`, Arkiv `first-entity` + `react` guide, ENS `tutorial-contract-developers` + `permissioned-resolver`
- [ ] Start `arkiv/friction.md` **now** and add to it while you build

---

## 14. Demo video (3–4 minutes, one video for all sponsors)

| Time | Show | For |
|---|---|---|
| 0:00–0:20 | Problem: OTC and pre‑launch deals rely on trust; brokers are unverifiable | All |
| 0:20–0:55 | **Arc Studio**: prompt, generated contracts, tests passing, deploy to Arc Testnet | Arc (required) |
| 0:55–1:35 | Create OTC order → appears in the market (**read from Arkiv**, filters) → partial fill → fee split → withdraw | Arc + Arkiv |
| 1:35–2:15 | Premarket: TGE countdown → deliver on one offer; **automatic default** on another (claimDefault payout) | Arc |
| 2:15–2:55 | Broker: `ravi.presettle.eth` badge → edits `presettle.prefs` ✅ → tries `presettle.status` ❌ (EAC) → admin **revokes** → deal blocked | ENS |
| 2:55–3:20 | Broker link expires after 10 minutes (refresh → "expired"); "📦 Stored on Arkiv" explorer link | Arkiv |
| 3:20–3:40 | Architecture diagram + what's next | All |

(If you do Swarm: show the term sheet opening from Swarm and note the timestamp in `swarm.md`.)

---

## 15. Submission checklist

### ETHGlobal (all)
- [ ] Public repo, steady commits, MIT license, README with setup
- [ ] **AI usage statement** (Arc Studio, Claude Code, etc.)
- [ ] Live demo link + video
- [ ] Select partner prizes: **Arc**, **ENS**, **Arkiv** (+ tick the **Arkiv + Swarm** bonus if you did it)

### Arc
- [ ] Bounty named: **"Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio"**
- [ ] **Arc Studio project URL** in the README and submission
- [ ] Studio visible in the video
- [ ] Working frontend **and** backend
- [ ] Architecture diagram (`docs/architecture.png`)
- [ ] Arc Testnet contract addresses + explorer links
- [ ] Docs: escrow state machines, fee split, dispute rules, security checklist, Circle tools used

### ENS
- [ ] ENSv2 on **Sepolia**, central to the product (gate + licensing + EAC)
- [ ] Nothing hard‑coded (names resolved live)
- [ ] **Live demo link**
- [ ] README: parent name, UserRegistry address, example broker name, resolver address, role design

### Arkiv
- [ ] Writes to Rabdi via `@arkiv-network/sdk`. Users see data **read** from Arkiv.
- [ ] README: **writer wallet addresses** + **one runnable query**
- [ ] `/arkiv/schema.md`, `friction.md`, `reach.md`, `why-arkiv.md`, `how-you-use-arkiv.md`
- [ ] (Bonus) `/arkiv/swarm.md` with stamp batch ID, entity key → reference, video timestamp

---

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Arc wants the app connected "without leaving Studio" | Ask the Arc booth on day 1. If needed, have Studio generate the base app, then extend it. |
| ENSv2 is new, so some call signatures may be off | Start ENS on day 1 (H0–H10). Read events from receipts. Ask at the ENS booth. |
| Three chains means confusing UX | Chain badges on every action. Pre‑funded demo wallets. Arkiv writes batched where possible. |
| Arc transactions silently dropped | `maxFeePerGas >= 20 gwei` |
| USDC decimals bugs | ERC‑20 6 decimals everywhere, `decimals()` calls, unit tests on the payout math |
| Arkiv rate limits | Use the access key, poll at most every 15 s, paginate |
| Spoofed Arkiv rows | Verifier (§7.7) |
| Running out of time | Cut lines (§12) |

---

## 17. References
- Prize pages: [Arc](https://ethglobal.com/events/mumbai/prizes#arc) · [Arkiv](https://ethglobal.com/events/mumbai/prizes/arkiv) · [ENS](https://ethglobal.com/events/mumbai/prizes/ens)
- **Arc:** [docs](https://docs.arc.io) · [connect](https://docs.arc.io/arc/references/connect-to-arc.md) · [contract addresses](https://docs.arc.io/arc/references/contract-addresses.md) · [EVM differences](https://docs.arc.io/arc/references/evm-differences.md) · [deploy contracts](https://docs.arc.io/arc/tutorials/deploy-contracts.md) · [Arc Foundry](https://docs.arc.io/arc/tutorials/install-arc-foundry.md) · [App Kit / bridge](https://docs.arc.io/app-kit.md) · [Arc Studio](https://studio.arc.io) · [Studio agent guide](https://studio.arc.io/llms.txt) · [Circle faucet](https://faucet.circle.com)
- **Arkiv:** [docs](https://docs.arkiv.network) · [first entity](https://docs.arkiv.network/start-here/first-entity/) · [clients](https://docs.arkiv.network/start-here/clients/) · [schemas](https://docs.arkiv.network/schemas/define/) · [column types](https://docs.arkiv.network/schemas/column-types/) · [expiration](https://docs.arkiv.network/writing/expiration/) · [change/delete](https://docs.arkiv.network/writing/change/) · [filter](https://docs.arkiv.network/querying/filter/) · [paginate](https://docs.arkiv.network/querying/paginate/) · [watch events](https://docs.arkiv.network/querying/watch-events/) · [React guide](https://docs.arkiv.network/guides/react/) · [limits](https://docs.arkiv.network/reference/limits/) · [SDK API](https://docs.arkiv.network/typescript-sdk/api-reference/) · [Hub / faucet / keys](https://hub.arkiv.network) · [Swarm docs](https://docs.ethswarm.org)
- **ENSv2:** [overview](https://docs.ens.domains/ensv2/overview/) · [contract dev tutorial](https://docs.ens.domains/ensv2/tutorial-contract-developers/) · [app dev tutorial](https://docs.ens.domains/ensv2/tutorial-app-developers/) · [subnames](https://docs.ens.domains/ensv2/subnames) · [permissioned registry](https://docs.ens.domains/ensv2/permissioned-registry) · [permissioned resolver](https://docs.ens.domains/ensv2/permissioned-resolver) · [enhanced access control](https://docs.ens.domains/ensv2/enhanced-access-control) · [verifiable factory](https://docs.ens.domains/ensv2/verifiable-factory) · [ETH registrar](https://docs.ens.domains/ensv2/eth-registrar) · [deployments](https://docs.ens.domains/learn/deployments)

---

## 18. Verification log (re-checked 2026‑11‑06)

Every technical claim in this plan was checked against the sponsor docs or the contract source.

| # | Claim | Result | Source |
|---|---|---|---|
| 1 | Arc Testnet chain ID 5042002, RPC/WS, explorer, faucet | ✅ | docs.arc.io › connect-to-arc |
| 2 | USDC ERC‑20 `0x3600…0000` = **6 dec**; native gas USDC = **18 dec**; EURC `0x89B5…D72a` | ✅ | docs.arc.io › contract-addresses, evm-differences |
| 3 | Never mix `msg.value` and `balanceOf`; timestamps non‑decreasing; 20 gwei floor (silent drop); blocklist reverts; value to `0x0` reverts; use `arc-anvil` | ✅ | docs.arc.io › evm-differences |
| 4 | viem exports `arcTestnet` | ✅ | github.com/wevm/viem › src/chains/definitions/arcTestnet.ts |
| 5 | Arc Studio: hosted agent; testnet one‑click deploy incl. Arc Testnet; CLI `@circle-fin/arc-studio-cli`, `login`, `agent-guide`, `pull`, `--file`; doesn't edit your local repo | ✅ | studio.arc.io, studio.arc.io/llms.txt |
| 6 | Arc prize: Studio project URL + Studio in demo, working frontend + backend, architecture diagram, video, repo, name the bounty | ✅ | ETHGlobal Arc prize text |
| 7 | Arkiv: 9 column types and their value‑wrapping rules | ✅ | docs.arkiv.network › schemas/column-types |
| 8 | `ExpirationTime` from `"@arkiv-network/sdk"`; `createEntity(schema, values, { expiration, flags, salt })` → `{ entityKey, txHash, expiresAt }` | ✅ | docs.arkiv.network › writing/create |
| 9 | Max lifetime ~182.5 days; 2 s blocks; extension counts from now; **no expiry event** | ✅ | docs.arkiv.network › writing/expiration, querying/watch-events |
| 10 | `getEntity` throws `NoEntityFoundError` for expired, deleted or unknown keys | ✅ | docs.arkiv.network › querying/get-entity |
| 11 | Pagination: `limit` 1–100, `offset`, key‑based paging with `orderBy(asc("$key"))` | ✅ | docs.arkiv.network › querying/paginate |
| 12 | `watchEntityEvents({ onEntityCreated, onEntityPatched, onExpiryExtended, onOwnershipTransferred, onEntityDeleted, onEvent, onError, pollingInterval })` (polling) | ✅ | docs.arkiv.network › querying/watch-events |
| 13 | `executeBatch` is atomic | ✅ | docs.arkiv.network › writing/batches |
| 14 | Access keys raise rate limits only; Origins = attribution, IP allowlist = access control; never put a keyed chain in a user's wallet | ✅ | docs.arkiv.network › start-here/access-keys |
| 15 | wagmi pattern: `useWalletClient({ chainId })` → `createWalletClient({ transport: custom(wc.transport) })`; don't use `window.ethereum` | ✅ | docs.arkiv.network › guides/react |
| 16 | Arkiv prize criteria + Swarm bonus $500 (doesn't use a pick) + `swarm.md` contents | ✅ | ETHGlobal Arkiv prize page |
| 17 | ENSv2 Sepolia addresses incl. **MockUSDC `0x240b…14aa`** | ✅ | docs.ens.domains › learn/deployments |
| 18 | Mainnet ENSv2 not yet resolving (still v1 until launch), so use Sepolia | ✅ | docs.ens.domains › learn/deployments |
| 19 | `register(label, owner, registry, resolver, roleBitmap, expiry)`; **`roleBitmap = 0` with a real owner is allowed**; `unregister`, `renew`, `setSubregistry`, `setParent` signatures and roles | ✅ | ensdomains/contracts-v2 › PermissionedRegistry.sol |
| 20 | No `ROLE_CAN_TRANSFER_ADMIN` → `TransferDisallowed` (non‑transferable) | ✅ | docs.ens.domains › ensv2/permissioned-registry |
| 21 | `grantSetterRoles(encoded setText("0x", key, ""), account)` delegates one text key **per resolver instance**; DNS name via `toHex(packetToBytes(normalize(name)))` from `viem/ens` | ✅ | docs.ens.domains › ensv2/permissioned-resolver |
| 22 | VerifiableFactory `deployProxy(impl, salt, data)`; salt schemes for UserRegistry / PermissionedResolver; `initialize` arguments | ✅ | docs.ens.domains › ensv2/verifiable-factory |
| 23 | ETH Registrar: `makeCommitment` → `commit` → wait ≥ 60 s → `register(..., paymentToken, referrer)`; owner role bitmap at registration | ✅ | docs.ens.domains › ensv2/eth-registrar |

**Still open (ask the sponsor, not a docs question):**
- ⚠ Arc: does "connect them to a web or mobile app … without leaving Studio" allow pulling the Studio output into your own repo and extending it there? **Ask at the Arc booth on day 1.**

---

## 19. Prize-by-prize submission pack (checked against the real ETHGlobal pages)

For each of the 3 picks: the exact prize, every requirement, what you show for it, which developer doc backs it, and the text to paste into the submission.

### 19.1 ARC: "Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio"

**Prize (real page, 2026-11-06):** Arc total pool $15,000 = **5 bounties × $3,000**. There are **no place splits; each bounty is a single award.** Only "Arc Studio Continuity Track" is Continuity-only. Our bounty is open to fresh builds. Every Arc prize requires **Arc Studio as the starting point**, and you must **state which bounty** you are submitting for.

**What the bounty asks for → what Pre Settle shows → backing doc**

| Bounty wording | Pre Settle evidence | Developer doc that backs it |
|---|---|---|
| Programmable logic in **USDC or EURC** | USDC `0x3600…0000` + EURC `0x89B5…D72a` as escrow and collateral tokens | docs.arc.io › contract-addresses (both 6 dec) |
| **Conditional flows** | Premarket: deliver only in [TGE, TGE+window]; OTC: fills only before the deadline | evm-differences: timestamps non-decreasing → `>=` checks |
| **Onchain automation** | `expire()` / `claimDefault()` / `settleExpired()` are **permissionless**; the backend keeper calls them | — |
| **Multi-step settlement** | OTC partial fills; premarket lock → buy → TGE → deliver / default / dispute | — |
| "Conditional escrow with onchain dispute and automatic release" | `ConditionalEscrow.raiseDispute / resolveDispute` + arbiter timeout → default ruling via `settleExpired` | — |
| "Treasury management and payment splitting" | Maker / broker / platform split on every fill, paid by **pull-payments** | evm-differences: blocklisted transfers revert, so pull-payments keep settlement safe |
| Bonus: "contracts designed to be reused" | `ConditionalEscrow` as an abstract module with a `_conditionMet` hook + README usage section | — |
| "connect them to a web or mobile app" | React app wired to the deployed contracts | ⚠ ask the booth about "without leaving Studio" (§2.2) |

**Qualification (identical for all 5 Arc bounties) → deliverable**

| Requirement (real page) | Deliverable | Done? |
|---|---|---|
| **Built in Arc Studio**: shareable project URL judges can open + Studio shown in the demo | URL in README + submission; Studio clip at 0:20–0:55 in the video | ☐ |
| **Functional MVP and diagram**: working **frontend and backend** + **architecture diagram** | Vercel frontend + Node backend + `docs/architecture.png` | ☐ |
| **Video demo + presentation**: core functions + use of **Arc Studio and Circle developer tools**, with **detailed documentation** | Video (§14) + README + `docs/contracts.md` (state machines, fee math, dispute rules) | ☐ |
| **GitHub / Replit repo link** | Public GitHub repo | ☐ |
| **State which bounty** | First line of the submission text below | ☐ |

**Circle developer tools you can honestly claim** (judged in the video):
1. **Arc Studio**: write, test, audit and deploy (required)
2. **USDC as gas and settlement**: users hold only USDC (docs.arc.io: USDC is the native gas token)
3. **EURC**: euro-denominated deals
4. **Recommended add (low effort, from the Arc deploy tutorial):** run the backend keeper/platform account as a **Circle Dev-Controlled Wallet** (`@circle-fin/developer-controlled-wallets`, `blockchains: ["ARC-TESTNET"]`, `accountType: "SCA"`). SCA wallets work with **Circle Gas Station**, which sponsors transaction fees on Arc Testnet, so the automatic-release keeper runs without holding gas. Env: `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`. A deploy or transaction response only means "initiated", so poll the transaction status.
5. Stretch only: App Kit Bridge (CCTP, Arc domain 26) to fund from other chains

**Paste into the Arc submission field:**

> **Bounty: Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio.**
> Arc Studio project: `<STUDIO_URL>` · Live app: `<VERCEL_URL>` · Repo: `<GITHUB_URL>` · Architecture: `docs/architecture.png`
> Pre Settle is trustless OTC and pre-launch (premarket) trading settled in USDC/EURC on Arc. All contracts were written, tested, audited and deployed in Arc Studio:
> **ConditionalEscrow**, a reusable escrow module with on-chain disputes, an arbiter timeout default and permissionless automatic release · **OTCMarket**, with partial fills, deadlines, cancel and automatic expiry refunds, plus a maker/broker/platform fee split on every fill · **PremarketMarket**, where the seller locks 100% collateral, buyers pay before TGE, and the seller must deliver inside the TGE window or anyone can trigger the default payout (buyers get their payment plus the seller's collateral).
> Arc-specific engineering: 6-decimal ERC-20 USDC interface only (never mixed with 18-decimal native value), `>=` time checks for Arc's non-decreasing timestamps, and pull-payments so blocklisted addresses can't freeze settlement.
> Circle tools: Arc Studio, USDC (gas + settlement), EURC, Circle Dev-Controlled Wallet + Gas Station for the keeper.
> Contracts (Arc Testnet): `<addresses + explorer links>`

### 19.2 ENS: "Best Use of ENSv2"

**Prize (real page):** ENS pool $10,000. **Best Use of ENSv2 = $7,000: 1st $3,000 · 2nd $2,000 · 3rd $1,000 · 3rd $1,000 (four winners).** The other ENS prize ("Integration into an Existing Project", $3,000) is **Continuity-only and mainnet-only**, so it isn't for us.

**Qualification → deliverable → backing doc**

| Requirement (real page) | Pre Settle deliverable | Doc |
|---|---|---|
| Built on **ENSv2 on Ethereum mainnet or Sepolia** | Sepolia: `presettle.eth` + own UserRegistry + per-broker PermissionedResolvers | learn/deployments (mainnet still resolves via v1 until launch) |
| **ENSv2 features central, not cosmetic** | Deals are **gated** on the broker's ENSv2 registry status. Revocation (`unregister`) blocks deals live; L2 mirrors it to the Arc contract. | permissioned-registry (`getState`, `unregister`) |
| Use the highlighted features | **Hierarchical registry** (own UserRegistry via `setSubregistry` / `setParent`) · **Enhanced Access Control** (broker may set only `presettle.prefs` via `grantSetterRoles`) · **Permissioned Resolver** per broker · **subname types**: non-transferable (no `ROLE_CAN_TRANSFER_ADMIN`), expiring (`expiry` / `renew`), revocable (`unregister`) | enhanced-access-control, permissioned-resolver, registry source |
| **Functional demo, not hard-coded** | Names resolved live with viem `getEnsAddress` / `getEnsText` + registry `getState` | tutorial-app-developers |
| **Link to a live demo** | Vercel URL | — |
| **Open source** | Public GitHub repo, MIT | — |

**Demo must show (about 40 s):** a verified badge → broker edits `presettle.prefs` ✅ → broker tries `presettle.status` ❌ (`EACUnauthorizedAccountRoles`) → admin revokes → badge turns red, Approve is disabled → (L2) the Arc call reverts.

**Paste into the ENS submission field:**

> **Prize: Best Use of ENSv2** · Network: **Sepolia ENSv2** · Live demo: `<VERCEL_URL>` · Repo: `<GITHUB_URL>`
> Pre Settle uses ENSv2 as its **broker licensing system**. We registered `presettle.eth` and deployed our own **UserRegistry** (linked with `setSubregistry` + `setParent`). Each broker receives `<name>.presettle.eth` registered with an **empty role bitmap**, so the name is **non-transferable**. It is **expiring** (renewed while in good standing) and **revocable** (`unregister`). Each broker name is served by its **own PermissionedResolver**: Pre Settle controls `presettle.status` / `addr`, and **Enhanced Access Control** (`grantSetterRoles`) lets the broker edit **only** `presettle.prefs`. The app **refuses broker deals** unless the name is `REGISTERED` and unexpired, and revocations are mirrored to our Arc escrow contracts.
> Addresses: Pre Settle UserRegistry `<…>`, example broker `ravi.presettle.eth` → resolver `<…>`.

### 19.3 ARKIV: "Build on Arkiv (from scratch)" (+ optional Swarm bonus)

**Prize (real page):** Arkiv pool $15,000. **Build on Arkiv (from scratch) = $4,000: 1st $3,000 · 2nd $1,000.** **Each team can win one Arkiv track prize.** The **Arkiv + Swarm bonus (from scratch) = $500**, stacks on top, and the page says Arkiv's prizes count as **one partner prize**, so the bonus doesn't use one of the team's three picks. (This also confirms **3 partner picks per team**.)

**Judging (25% each) → file → our answer in one line**

| Criterion | File | Pre Settle answer |
|---|---|---|
| Arkiv feedback | `/arkiv/friction.md` | Real pain points with expected/actual/repro: 3-chain wallet switching, tGLM funding, `dec` needs strings, `u64(…n)` wrapping, 100-row paging, no expiry event |
| Reach | `/arkiv/reach.md` | OTC traders, brokers, pre-launch buyers; live URL; after Mumbai: public order-book API for other dApps and agents |
| Why Arkiv | `/arkiv/why-arkiv.md` | Postgres lets the operator edit, censor or front-run listings, and only we could read them. Arkiv: maker-owned, readable by any app, expires at the deadline. **Kept off:** funds (Arc), private contacts, live prices. |
| How you use Arkiv | `/arkiv/how-you-use-arkiv.md` | Expiry = deadline / TGE+window / 10-minute broker links; owner-only edits; read-only fills; `createdBy(ADMIN)` token list; anti-spoof verification against Arc; each feature mapped to UI |

**Qualification → deliverable**

| Requirement (real page) | Deliverable | Done? |
|---|---|---|
| Built from scratch at Mumbai | New repo, steady commits | ☐ |
| Writes to the current testnet via `@arkiv-network/sdk` / JSON-RPC | Rabdi (7794095) writes from the frontend + admin script | ☐ |
| **At least one user-visible feature reads from Arkiv** | Market page, My orders, broker link page, token dropdowns | ☐ |
| README: **writer wallet address(es)** + **one runnable query** | Admin + demo maker addresses; `node --experimental-strip-types scripts/arkiv-query.ts` | ☐ |
| `/arkiv/schema.md` + `/arkiv/friction.md` + one file per criterion | 5 files above | ☐ |
| Open-source license + AI-usage statement | MIT + README section | ☐ |
| **Not counted:** SDK installed but never read; Arkiv only as a log | We read it everywhere | ☐ |

**Swarm bonus checklist (only if you do it):** `/arkiv/swarm.md` with: what's on Swarm vs Arkiv + the field (`OtcOrder.termsRef`) · one entity key → Swarm reference with a link · **postage batch ID** + the buyer wallet + the Bee node/service · upload/read code files · run steps · **video timestamp** · obstacles · never an encrypted reference in a public entity.

**Paste into the Arkiv submission field:**

> **Prize: Build on Arkiv (from scratch)** [+ **Arkiv + Swarm bonus**] · Live: `<VERCEL_URL>` · Repo: `<GITHUB_URL>`
> Pre Settle's order book lives on Arkiv: OTC orders, premarket offers, 10-minute broker deal links, fills and trader profiles are **wallet-owned entities** with typed, indexed schemas (`presettle.*.v1`). Each **expires exactly when it stops being valid** (order deadline, TGE + delivery window, 10 minutes for broker links), so there's no cron and no stale listings. Funds stay in Arc escrow; every Arkiv row is verified against the on-chain order before display, so spoofed rows are filtered out. Fills are created **read-only**, giving an immutable track record. Writer wallets and a runnable query are in the README; `/arkiv/*.md` answers each judging criterion.

### 19.4 Totals you're competing for (verified)

| Pick | Max if 1st | Winners |
|---|---|---|
| Arc: Advanced Stablecoin Logic | $3,000 | 1 |
| ENS: Best Use of ENSv2 | $3,000 | 4 (3k / 2k / 1k / 1k) |
| Arkiv: Build from scratch | $3,000 | 2 (3k / 1k) |
| Arkiv + Swarm bonus (no pick used) | $500 | — |
| **Total max** | **$9,500** + ETHGlobal finalist prizes | |

> Not re-checked: the ETHGlobal **event info page** (event times, submission deadline, video length), because that fetch was cancelled. Confirm the **submission deadline** and any **video length limit** on ethglobal.com/events/mumbai before recording.
