# Pre Settle

**Trustless OTC and pre-launch (premarket) token trading, settled in stablecoins.**

- **Money** is locked in USDC/EURC escrow contracts on **Arc**.
- **The order book** is open, wallet-owned data on **Arkiv**: no database.
- **Every listing is verified** against the escrow contract before it is shown.

> Built at **ETHGlobal Mumbai 2026**, from scratch.

| | |
|---|---|
| **Live app** | https://presettle-ethglobal.vercel.app |
| **Backend API** | https://3.109.65.92.nip.io/v1 ([health](https://3.109.65.92.nip.io/health)) |
| **OTCMarket** (Arc Testnet) | [`0xB7c66d9136C5D6941467CC5B541b7272328DC17c`](https://explorer.testnet.arc.io/address/0xB7c66d9136C5D6941467CC5B541b7272328DC17c) |
| **PremarketMarket** (Arc Testnet) | [`0xB26990f986533AD138F70fc160a698Dd5E35Abf0`](https://explorer.testnet.arc.io/address/0xB26990f986533AD138F70fc160a698Dd5E35Abf0) |
| **Arc Studio project** | _link to be added_ |
| **Demo video** | _link to be added_ |

---

## The problem

OTC deals and pre-launch token sales mostly happen in Telegram groups and on centralized desks. You have to trust a middleman to hold the money and trust their database for prices and history: listings can be edited, hidden or faked, and expired deals stay visible.

## What Pre Settle does

### OTC market
1. A **maker** locks the tokens they sell (or the USDC/EURC they buy with) in the **OTCMarket** escrow and sets a price, a deadline and whether partial fills are allowed.
2. **Takers** fill all or part of the order. The contract computes the price on-chain, so nobody can underpay.
3. The maker can **cancel** at any time. After the deadline, **anyone** can call `expire()`; our **keeper** does it automatically, so unfilled tokens always go back to the maker.

### Premarket (pre-launch tokens)
1. The admin opens a **market**: symbol, TGE time and delivery window.
2. A **seller** locks **100% collateral** in USDC or EURC and lists an amount and price. **Buyers** pay before TGE.
3. After TGE the real token is set and the seller **delivers** to every buyer inside the window.
4. If the seller doesn't deliver, anyone can trigger the **default**: each buyer gets their payment back **plus** a share of the seller's collateral. If the token never launches, the offer is **voided** and everyone is refunded.

### Balances (pull payments)
Proceeds, refunds, delivered tokens and fees are **credited** in the escrow and **withdrawn** from **Dashboard → Balances**. On Arc, USDC can block addresses; with pull payments one blocked address can never freeze settlement for everyone else.

---

## Architecture

![Pre Settle architecture: money on Arc, order book on Arkiv](docs/architecture.png)

1. Users lock, fill, buy, deliver, claim and withdraw on **Arc**. Every transaction is signed in their own wallet.
2. The listing or fill record is then written to **Arkiv** by the same wallet, so the user owns it; it expires on its own at the deadline.
3. The frontend reads offers, orders, fills and the token list straight from Arkiv.
4. The **backend** serves verified orders, analytics, prices and admin sign-in. It queries Arkiv, checks every listing against the Arc contract, and runs the **keeper** that calls `expire()` after deadlines.

| Layer | Where | Why |
|---|---|---|
| Money: escrow, fills, settlement, fees | **Arc Testnet** | Contract-enforced guarantees; USDC is also the gas token |
| Listings, fills, profiles, token list | **Arkiv** (Rabdi testnet) | Owned by the user's wallet, publicly queryable, expires by itself |
| Prices | Backend (CoinMarketCap, 5-min cache) | Change every second, so they don't belong in storage |
| Maker names | ENS on Sepolia | Shows `name.eth` instead of `0x…` when the maker has one |

---

## How Arkiv is used

| Entity (`presettle.*.v1`) | Owner | Expires | Filterable fields |
|---|---|---|---|
| OTC order | maker | at the order **deadline** | maker, side, tokens, price, partial, orderId, deadline |
| Premarket offer | seller | after **TGE + delivery window** | seller, market, symbol, collateral, price, offerId, TGE |
| Fill | taker | 90 days, **read-only** | market, refId, taker, maker |
| Trader profile | trader | 180 days, extended on each save | ens |
| Token list entry | admin wallet | maximum lifetime | kind, address, symbol |

- Only the fields the UI filters on are indexed, because each index costs on every write.
- The schema name is **not** a security boundary: the token list is trusted only via `createdBy(admin)`, and every order is verified on Arc.
- Full schema: [arkiv/schema.md](arkiv/schema.md). Judging documents: [arkiv/](arkiv/).

**Query the live order book** (read-only, no wallet needed):
```bash
cd backend && npm install && node scripts/arkiv-query.js
```

**Wallets that wrote entities** (Arkiv Rabdi):

| Wallet | Wrote |
|---|---|
| `0xfEceA7b046b4DaFACE340c7A2fe924cf41b6d274` | OTC order, premarket offer, token list |
| `0x3904a0bd83F6dB9e79AdFeE0A07B6341f59D993F` | Fill records |

---

## Smart contracts

| Contract | Highlights |
|---|---|
| **OTCMarket** | Escrow the offer; `fill` with on-chain pricing (`Math.mulDiv`, rounded in the escrow's favour); `cancel`; permissionless `expire`; platform fee split; `withdraw` |
| **PremarketMarket** | 100% seller collateral; `buy` before TGE (at most 50 buyers per offer, minimum first purchase 1/50); `deliver` inside the window; `claimDefault` / void; `reclaimUnsold`; `withdraw` |

- State changes before transfers; every settlement path can run **only once**; no native value accepted; `Ownable2Step`.
- **35 Hardhat tests**, including a solvency check after every path. The deployed bytecode matches this repo's build.
- Interface the app relies on: [docs/CONTRACT_INTERFACE.md](docs/CONTRACT_INTERFACE.md). Details: [contracts/](contracts/).

---

## Tech stack

| Part | Technologies |
|---|---|
| Contracts | Solidity 0.8.24, OpenZeppelin, Hardhat (+ Ignition, ethers) |
| Frontend | React 19, Vite, Tailwind CSS, wagmi, viem, RainbowKit, TanStack Query, Arkiv SDK |
| Backend | Node.js, Express, viem, Arkiv SDK, zod |
| Infrastructure | Vercel (frontend), Docker + nginx on AWS EC2 (backend), GitHub Actions, Let's Encrypt |
| Services | Arc Testnet (USDC/EURC), Arkiv Rabdi, CoinMarketCap API, ENS (Sepolia) |

---

## Repository layout

| Folder | What it holds |
|---|---|
| [contracts/](contracts/) | Solidity contracts, Hardhat tests, deploy modules, deployment record |
| [frontend/](frontend/) | React web app |
| [backend/](backend/) | Node API: order verification, analytics, prices, admin sign-in, keeper |
| [arkiv/](arkiv/) | Arkiv schema and judging documents |
| [docs/](docs/) | Architecture diagram, deployment guide, contract interface, build plan |
| [scripts/](scripts/) | Where the Arkiv scripts live (in `backend/scripts`) |

---

## Run locally

Requirements: Node.js 20+ and a wallet on Arc Testnet (USDC from https://faucet.circle.com) and Arkiv Rabdi (tGLM from https://hub.arkiv.network/faucet).

```bash
# 1. backend (http://localhost:3000)
cd backend && cp .env.example .env && npm install && npm run dev

# 2. frontend (http://localhost:5173), in a second terminal
cd frontend && cp .env.example .env && npm install && npm run dev

# 3. contracts: compile (exports ABIs to the app) and test
cd contracts && npm install && npx hardhat compile && npx hardhat test
```

Every `.env.example` documents its variables. Missing values switch features off rather than failing.

## Tests

| Suite | Command | Result |
|---|---|---|
| Contracts | `cd contracts && npx hardhat test` | 35 passing |
| Backend | `cd backend && npm test` | 28 passing |

## Deployment

- **Frontend:** Vercel, Root Directory `frontend`, deploys on every push to `main`.
- **Backend:** GitHub Actions → Docker Hub → AWS EC2 (Docker Compose + nginx + Let's Encrypt), on pushes that change `backend/`. All settings come from one `BACKEND_ENV_FILE` secret.
- **Contracts:** Arc Testnet; addresses in [contracts/deployments/arc-testnet.json](contracts/deployments/arc-testnet.json).

Full guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## AI usage

- **Claude Code** (Anthropic) was used as a coding assistant for the frontend, the backend, the Arkiv integration, the contract tests and deploy scripts, the deployment setup and the documentation, and to review the contracts for security issues.
- The Solidity contracts were written by our contract developer.
- All AI output was reviewed, tested and committed by the team.

## License

[MIT](LICENSE)
