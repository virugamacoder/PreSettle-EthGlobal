# frontend

React 19 + Vite 8 + Tailwind 4 + wagmi 2 + RainbowKit + React Router 7.

## Run locally

```bash
cd frontend
cp .env.example .env      # set VITE_BASE_URL to the backend (default http://localhost:3000/v1)
npm install
npm run dev               # http://localhost:5173
npm run build             # production build in dist/
```

## Chains

| Chain | Used for |
|---|---|
| **Arc Testnet** (5042002) | Default chain: escrow contracts, USDC/EURC payments and gas |
| **Arkiv Rabdi** (7794095) | Order book writes: listings, deal links, fills, profiles. The wallet switches here for those signatures. |
| **Sepolia** | ENSv2: broker license lookups and the broker's `presettle.prefs` record |

## Pages

| Route | What it does |
|---|---|
| `/` | Premarket offers (Arkiv) with TGE countdowns |
| `/premarket/:key` | Offer details; buy before TGE; deliver / claim default / cancel / reclaim |
| `/otc` | OTC order book (Arkiv listings verified on Arc by the backend) with filters |
| `/otc/:key` | Order details; fill (partial/full) or cancel |
| `/create` | Create an OTC order or a premarket offer (`?tab=premarket`) |
| `/broker` | Broker-arranged orders, create a 10-minute deal link, your active links |
| `/deal/:key` | Client approves a broker deal; gated by the broker's ENSv2 license |
| `/dashboard` | Your orders, fills and withdrawable balances |
| `/admin` | Sign-In with Ethereum; broker licenses, premarket markets, token list |
| `/settings` | Theme, Arkiv trader profile, broker ENS prefs |

## Contracts

The contract calls follow the interface in [docs/CONTRACT_INTERFACE.md](../docs/CONTRACT_INTERFACE.md):
- [src/contracts/otc.js](src/contracts/otc.js)
- [src/contracts/premarket.js](src/contracts/premarket.js)

When the real ABIs arrive, replace the ABIs in those files and set the contract addresses in `.env`. Until an address is set, the related screens say the contract isn't configured.

## Environment

See [.env.example](.env.example). Everything is public (bundled into the browser).

| Variable | Notes |
|---|---|
| `VITE_BASE_URL` | Backend API including `/v1` |
| `VITE_WALLETCONNECT_PROJECT_ID` | From cloud.reown.com. Without it, the WalletConnect config calls fail (400/403 in the console) and mobile wallets don't work. |
| `VITE_ARC_TESTNET_RPC_URL` | Optional; defaults to `https://rpc.testnet.arc.io` |
| `VITE_OTC_CONTRACT_ARC_TESTNET`, `VITE_PREMARKET_CONTRACT_ARC_TESTNET` | Contract addresses |
| `VITE_ARKIV_ACCESS_KEY` | Arkiv Hub key; add the site to its **Origins** |
| `VITE_ARKIV_ADMIN_ADDRESS` | Wallet that publishes the curated token list |
| `VITE_SEPOLIA_RPC_URL`, `VITE_ENS_PARENT_NAME` | ENSv2 on Sepolia (`presettle.eth` by default) |

## Deploy

Live at **https://presettle-ethglobal.vercel.app**. Vercel with **Root Directory = `frontend`** redeploys on every push to `main`; after changing an environment variable, redeploy so the build picks it up. See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).

