# Deployment: Pre Settle

One repository, three deploy targets:

| Part | Folder | Where it runs | Live URL | How it deploys |
|---|---|---|---|---|
| Frontend | `frontend/` | **Vercel** | https://presettle-ethglobal.vercel.app | Vercel Git integration, **Root Directory = `frontend`**, on every push to `main` |
| Backend | `backend/` | **AWS EC2** (Elastic IP `3.109.65.92`) | https://3.109.65.92.nip.io (API: `/v1`) | GitHub Actions → Docker Hub → SSH → Docker Compose, **when `backend/` changes** or by hand |
| Contracts | `contracts/` | **Arc Testnet** (chain 5042002) | OTCMarket `0xB7c66d9136C5D6941467CC5B541b7272328DC17c`, PremarketMarket `0xB26990f986533AD138F70fc160a698Dd5E35Abf0` | Built and deployed in **Arc Studio**, then pulled into `contracts/` with `arc-studio pull`. No CI |

Repository: https://github.com/virugamacoder/PreSettle-EthGlobal (public, as required for judging).

---

## 1. Frontend on Vercel

1. vercel.com → **Add New → Project** → import `virugamacoder/PreSettle-EthGlobal`. The first time, install the Vercel GitHub app on the `virugamacoder` account.
2. **Root Directory: `frontend`**.
3. Framework preset **Vite** (build `vite build`, output `dist`). `frontend/vercel.json` already rewrites every route to `index.html`, so refreshing `/otc` works.
4. **Environment variables.** Every `VITE_` value is built into the public site, so never put private keys here:

   | Key | Value |
   |---|---|
   | `VITE_BASE_URL` | `https://3.109.65.92.nip.io/v1` |
   | `VITE_WALLETCONNECT_PROJECT_ID` | From cloud.reown.com (add the Vercel domain to the project's allowed domains) |
   | `VITE_ARC_TESTNET_RPC_URL` | An Arc Testnet RPC (Infura or `https://rpc.testnet.arc.io`) |
   | `VITE_ARKIV_ACCESS_KEY` | From hub.arkiv.network (add `https://presettle-ethglobal.vercel.app` to the key's **Origins**) |
   | `VITE_ARKIV_ADMIN_ADDRESS` | Wallet that publishes the curated token list |
   | `VITE_SEPOLIA_RPC_URL` | Sepolia RPC (ENS) |
   | `VITE_ENS_PARENT_NAME` | `presettle.eth` |
   | `VITE_OTC_CONTRACT_ARC_TESTNET` / `VITE_PREMARKET_CONTRACT_ARC_TESTNET` | `0xB7c66d9136C5D6941467CC5B541b7272328DC17c` / `0xB26990f986533AD138F70fc160a698Dd5E35Abf0` |

5. **Changing a variable needs a redeploy** (Deployments → ⋯ → Redeploy), because Vite builds the values into the bundle.

---

## 2. Backend on AWS EC2

### 2.1 Server
| Item | Value |
|---|---|
| Instance | Ubuntu, t3.small, Elastic IP **`3.109.65.92`** |
| Security group | Inbound **22** (SSH; GitHub Actions needs it open), **80** and **443** |
| SSH | `ssh -i presettle-key.pem ubuntu@3.109.65.92` (key from the EC2 launch, kept privately, never committed) |
| App folder (`APP_DIR`) | `/home/ubuntu/presettle` |
| Runs | Docker Compose services `app` (Node, port 3000) and `nginx` (HTTPS on 443, redirect on 80) |
| HTTPS | Let's Encrypt certificate for `3.109.65.92.nip.io`, issued and renewed by the deploy workflow (no certificate secrets needed) |

**One-time setup on a fresh server** (already done on the current one):
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
mkdir -p ~/presettle/nginx/certs
```

### 2.2 GitHub secrets
Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `SERVER_HOST` | `3.109.65.92` (IP only; the workflow adds `.nip.io`) |
| `SERVER_USER` | `ubuntu` |
| `SERVER_PORT` | `22` |
| `SERVER_SSH_KEY` | Full content of the EC2 `.pem` key, including the `BEGIN`/`END` lines |
| `APP_DIR` | `/home/ubuntu/presettle` |
| `DOCKER_HUB_USERNAME` | Docker Hub user (image: `<user>/pre-settle-backend`) |
| `DOCKER_HUB_TOKEN` | Docker Hub personal access token, **Read & Write** |
| `CERTBOT_EMAIL` | Email for Let's Encrypt |
| `BACKEND_ENV_FILE` | **The whole backend `.env`** (multi-line), see 2.3 |

### 2.3 `BACKEND_ENV_FILE`
The workflow writes this secret to `<APP_DIR>/.env` and appends `DOCKER_IMAGE=<user>/pre-settle-backend:latest`. **If this secret is empty, the backend still starts, but prices, ENS and admin login are off.** Follow `backend/.env.example`:

| Variable | Production value / note |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `BASE_URL` | `https://3.109.65.92.nip.io` |
| `CORS_ORIGINS` | `https://presettle-ethglobal.vercel.app,http://localhost:5173` (full origins, no trailing slash; empty = allow all) |
| `ARC_RPC_URL` | Arc Testnet RPC |
| `OTC_CONTRACT` / `PREMARKET_CONTRACT` | `0xB7c66d9136C5D6941467CC5B541b7272328DC17c` / `0xB26990f986533AD138F70fc160a698Dd5E35Abf0` |
| `BROKER_REGISTRY` | Empty (broker feature paused) |
| `ARKIV_ACCESS_KEY` | Arkiv key (add the server IP to its **IP allowlist** in Arkiv Hub) |
| `ARKIV_ADMIN_ADDRESS` | Token-list admin wallet |
| `SEPOLIA_RPC_URL`, `ENS_PARENT_NAME`, `ENS_USER_REGISTRY` | ENS (registry empty until the ENS setup runs) |
| `PLATFORM_PRIVATE_KEY` | **Testnet-only** robot wallet for the keeper (needs Arc Testnet USDC for gas). Never the admin wallet's key |
| `ADMIN_WALLETS` | Admin wallet address(es), comma-separated |
| `AUTH_SECRET` | 64 random hex characters (`openssl rand -hex 32`) |
| `SIWE_DOMAIN` | `presettle-ethglobal.vercel.app` (domain only: no `https://`, no `/`) |
| `KEEPER_ENABLED` / `KEEPER_INTERVAL_MS` | `false` until the contracts are live / `30000` |
| `COINMARKETCAP_API_KEY` | Reference prices |

### 2.4 Workflow
[`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml):

- **Triggers:** push to `main` that changes `backend/**` or the workflow file, or by hand: **Actions → Deploy Backend → Run workflow**. Pushes that only touch `frontend/`, `contracts/` or docs don't deploy the backend.
- **Build:** Docker image from `./backend`, pushed as `<DOCKER_HUB_USERNAME>/pre-settle-backend:latest` and `:sha-…`.
- **Deploy:** writes `.env` from `BACKEND_ENV_FILE`, makes sure the Let's Encrypt certificate exists (skipped while it's valid for 7+ more days), copies `backend/docker-compose.yml` + `backend/nginx/nginx.conf` to `APP_DIR`, then `docker compose up -d`.
- **Health check:** waits for `https://3.109.65.92.nip.io/health`. On failure it prints the last 50 lines of the app log.

**After changing `BACKEND_ENV_FILE`, run the workflow by hand.**

### 2.5 Check it worked
- `https://3.109.65.92.nip.io/health` → `{"status":"ok","service":"pre-settle-backend",…}`
- `https://3.109.65.92.nip.io/v1/status` → Arc and Arkiv `ok: true`
- On the server: `cd ~/presettle && docker compose ps` shows `presettle-app-1` (healthy) and `presettle-nginx-1`
- Logs: `cd ~/presettle && docker compose logs --tail=100 app`

---

## 3. Contracts (Arc Testnet)

- Built, tested, audited and deployed in **Arc Studio** (https://studio.arc.io), matching [CONTRACT_INTERFACE.md](CONTRACT_INTERFACE.md).
- `arc-studio pull` brings the code into `contracts/`. Commit it.
- Record addresses in `contracts/deployments/arc-testnet.json` and ABIs in `contracts/abi/`.
- Then set the addresses in **Vercel** (`VITE_OTC_CONTRACT_ARC_TESTNET`, `VITE_PREMARKET_CONTRACT_ARC_TESTNET`, then redeploy) and in **`BACKEND_ENV_FILE`** (`OTC_CONTRACT`, `PREMARKET_CONTRACT`, then run the workflow). Finally fund the keeper wallet with Arc Testnet USDC and set `KEEPER_ENABLED=true`.

---

## 4. External services checklist

| Service | Setting |
|---|---|
| Arkiv Hub (access key) | Origins: `https://presettle-ethglobal.vercel.app`, `http://localhost:5173` · IP allowlist: `3.109.65.92` |
| Reown / WalletConnect | Allowed domain: `presettle-ethglobal.vercel.app` |
| Infura | If the key is restricted by origin, use a separate unrestricted key for the backend (server calls have no browser origin) |
| Circle faucet | Arc Testnet USDC for test wallets and the keeper wallet |

---

## 5. Retired

The previous SettleX backend server (`13.207.134.130`) isn't used by Pre Settle. Stop it in EC2 once nothing depends on it.
