# Deployment: pre-settle-eth-global

One repository, three deploy targets:

| Part | Folder | Where it runs | How it deploys |
|---|---|---|---|
| Frontend | `frontend/` | **Vercel** | Vercel Git integration, **Root Directory = `frontend`** |
| Backend | `backend/` | **AWS EC2** (the existing Pre Settle server) | GitHub Actions → Docker Hub → SSH → Docker Compose, **only when `backend/` changes** |
| Contracts | `contracts/` | **Arc Testnet** | Deployed from **Arc Studio**, then pulled into `contracts/` with `arc-studio pull`. No CI. |

---

## 1. Push the repo to GitHub

```bash
gh repo create pre-settle-eth-global --public --source . --push
# or create it on github.com, then:
git remote add origin https://github.com/<you>/pre-settle-eth-global.git
git push -u origin main
```

The repo must be **public** for judging.

---

## 2. Frontend on Vercel

1. vercel.com → **Add New → Project** → import `pre-settle-eth-global`
2. **Root Directory: `frontend`**. This is the key setting for a single repo.
3. Framework preset: **Vite** (build `vite build`, output `dist`)
4. Environment variables (full list in `frontend/.env.example`):

   | Key | Value |
   |---|---|
   | `VITE_BASE_URL` | `https://13.207.134.130.nip.io/v1` (same backend URL as before) |
   | `VITE_WALLETCONNECT_PROJECT_ID` | from cloud.reown.com |
   | `VITE_ARKIV_ACCESS_KEY` | from hub.arkiv.network (add the Vercel domain to the key's **Origins**) |
   | `VITE_OTC_CONTRACT_ARC_TESTNET`, `VITE_PREMARKET_CONTRACT_ARC_TESTNET`, … | contract addresses from Arc Studio |
   | `VITE_SEPOLIA_RPC_URL` | Sepolia RPC (ENS) |
   | `VITE_ARKIV_ADMIN_ADDRESS` | wallet that publishes the curated token list |
   | `VITE_ENS_PARENT_NAME` | `presettle.eth` (or the parent name you registered) |
   | `VITE_ARC_TESTNET_RPC_URL` | optional, defaults to `https://rpc.testnet.arc.io` |

5. Add `frontend/vercel.json` so page refreshes don't return 404:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
6. Optional: skip frontend builds when only other folders change. Vercel → Settings → Git → **Ignored Build Step**:
   ```bash
   git diff HEAD^ HEAD --quiet -- .
   ```
   (This runs inside the Root Directory, so `.` means `frontend/`.)
7. If an old Pre Settle Vercel project exists, delete it (or remove its domain) once the new one is live.

---

## 3. Backend on the existing AWS server (replacing the old Pre Settle backend)

### How the swap works
The new workflow deploys into the **same EC2 server, same `APP_DIR`, same nginx and HTTPS certificate**. Docker Compose sees the same project and replaces the old `app` container with the new image. The URL stays `https://13.207.134.130.nip.io`.

### 3.1 Before the first deploy
1. **Turn off the old repo's workflow** so it can't redeploy the old backend:
   GitHub → old `SettleX-backend` repo → **Settings → Actions → General → Disable actions**.
2. Already in this repo: the backend listens on port **3000** with **`GET /health`**; `backend/Dockerfile`, `backend/docker-compose.yml` (services `app` + `nginx`) and `backend/nginx/nginx.conf` (HTTPS with `nginx/certs/cert.pem` + `private.key`) are what the workflow deploys.
3. Use the **same `APP_DIR`** as the old backend. Docker Compose names the project after that folder, so the new `app` and `nginx` containers replace the old ones on ports 80/443.

### 3.2 GitHub secrets (new repo → Settings → Secrets and variables → Actions)
Secret values can't be copied from the old repo; enter them again.

**Same as the old backend (server, Docker Hub, certificate):**

| Secret | Value |
|---|---|
| `DOCKER_HUB_USERNAME` / `DOCKER_HUB_TOKEN` | Docker Hub login and access token |
| `SERVER_HOST` | `13.207.134.130` |
| `SERVER_USER` | `ubuntu` |
| `SERVER_SSH_KEY` | full content of `settlex-key.pem` |
| `SERVER_PORT` | `22` |
| `APP_DIR` | **same path as the old backend** (e.g. `/home/ubuntu/settlex`) so it replaces it in place |
| `CERTBOT_EMAIL` | your email |

**The app's settings: one secret holding the whole `.env`:**

| Secret | Value |
|---|---|
| `BACKEND_ENV_FILE` | Paste the full content of the backend `.env` (multi-line), following `backend/.env.example` |

The workflow writes this secret to `<APP_DIR>/.env` on the server and appends `DOCKER_IMAGE=<user>/pre-settle-backend:latest`. To add or change a variable, edit this one secret; the workflow doesn't change. Include `COINMARKETCAP_API_KEY=...` if you want reference prices on order pages. Remember to lock the Arkiv access key to the server IP (Arkiv Hub → **IP allowlist**) and use **testnet-only** private keys.

### 3.3 Workflow file
The workflow is in the repo: [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml).

- Runs on push to `main` when `backend/**` changes, or manually (**Actions → Deploy Backend → Run workflow**).
- **Build:** Docker image from `./backend`, pushed as `<DOCKER_HUB_USERNAME>/pre-settle-backend:latest` and `:sha-…`.
- **Deploy:** writes `.env` from `BACKEND_ENV_FILE`, makes sure the Let's Encrypt certificate for `<SERVER_HOST>.nip.io` exists (skipped if still valid), copies `backend/docker-compose.yml` + `backend/nginx/nginx.conf` to `APP_DIR`, then `docker compose up -d`. This replaces the old Pre Settle container in place.
- **Health check:** waits for `https://<SERVER_HOST>.nip.io/health` to return `{"status":"ok"}`.

### 3.4 Check it worked
- `https://13.207.134.130.nip.io/health` returns `{"status":"ok"}`
- On the server: `cd <APP_DIR> && docker compose ps` shows the `pre-settle-backend` image
- Rollback: re-enable the old repo's workflow and re-run its last successful deploy

---

## 4. Contracts (Arc Testnet)
- Build, test and deploy in **Arc Studio** (https://studio.arc.io). One-click deploy to Arc Testnet.
- `arc-studio pull` brings the code into `contracts/`. Commit it.
- Put the deployed addresses in `contracts/deployments/arc-testnet.json`, the Vercel env vars and the backend secrets.

---

## Alternative: three separate repos
If you'd rather have `pre-settle-eth-global-frontend`, `-backend` and `-contract`:
- **Frontend repo** → Vercel exactly as above, but Root Directory is the repo root.
- **Backend repo** → the old workflow works unchanged (context `.`); only rename the image and update the `.env` keys.
- **Contract repo** → Arc Studio pull target.
- For submission: give judges **one main link** (e.g. the frontend repo) whose README links the other two and holds `/arkiv/*.md`, the Arc Studio URL and the contract addresses.
