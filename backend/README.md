# backend

Node 20 + Express 5 + viem + Arkiv SDK.

What it does:
- **Order book API:** reads OTC listings from Arkiv and verifies each one on Arc
- **Broker licenses:** issues, renews and revokes ENSv2 names on Sepolia (admin only)
- **Keeper:** expires OTC orders after their deadline so makers get refunded

## Run locally

```bash
cd backend
cp .env.example .env     # fill in what you have; missing values just switch features off
npm install
npm run dev              # http://localhost:3000
npm test
```

On startup the server logs which features are **on** and which are **off** because of missing configuration.

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | `{"status":"ok"}`; used by Docker, nginx and the deploy workflow |
| GET | `/v1/config` | — | Public settings: chain ID, USDC/EURC, contract addresses, ENS parent, feature flags |
| GET | `/v1/status` | — | Latest block on Arc / Arkiv / Sepolia, platform account, keeper status |
| GET | `/v1/orders` | — | OTC orders from Arkiv, verified on Arc. Query: `side`, `offerToken`, `wantToken`, `maker`, `partial`, `minPrice`, `maxPrice`, `limit` (≤100), `cursor` |
| GET | `/v1/brokers/:label` | — | Broker license: status, expiry, address, `settlex.*` records, `verified` |
| GET | `/v1/auth/nonce` | — | One-time nonce for Sign-In with Ethereum |
| POST | `/v1/auth/verify` | — | `{message, signature}` → session token (admins are wallets in `ADMIN_WALLETS`) |
| POST | `/v1/admin/brokers` | admin | `{label, address, days, maxFeeBps}`: issue a broker license |
| POST | `/v1/admin/brokers/:label/revoke` | admin | Revoke (unregister) a license |
| POST | `/v1/admin/brokers/:label/renew` | admin | `{days}`: extend a license |

Admin routes need `Authorization: Bearer <token>` from `/v1/auth/verify`.

## Configuration

See [.env.example](.env.example). In production the whole file is stored in the `BACKEND_ENV_FILE` GitHub secret ([docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)).

| Feature | Needs |
|---|---|
| Order verification on Arc | `OTC_CONTRACT` |
| Arkiv (higher rate limits) | `ARKIV_ACCESS_KEY` |
| Broker lookup | `SEPOLIA_RPC_URL`, `ENS_USER_REGISTRY` |
| Broker issue/revoke | the above + `PLATFORM_PRIVATE_KEY` |
| Admin sign-in | `AUTH_SECRET`, `ADMIN_WALLETS` |
| Keeper | `KEEPER_ENABLED=true`, `PLATFORM_PRIVATE_KEY`, `OTC_CONTRACT` |

The contract functions the backend calls are listed in [docs/CONTRACT_INTERFACE.md](../docs/CONTRACT_INTERFACE.md). When the real ABI arrives, update [src/contracts/otc.js](src/contracts/otc.js).

## Deployment

The Docker image is built from this folder; `docker-compose.yml` + `nginx/nginx.conf` run it behind HTTPS on the EC2 server. Deploys run automatically on push to `main` when `backend/**` changes ([.github/workflows/deploy-backend.yml](../.github/workflows/deploy-backend.yml)).
