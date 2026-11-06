# Deployment: pre-settle-eth-global

One repository, three deploy targets:

| Part | Folder | Where it runs | How it deploys |
|---|---|---|---|
| Frontend | `frontend/` | **Vercel** | Vercel Git integration, **Root Directory = `frontend`** |
| Backend | `backend/` | **AWS EC2** (the existing SettleX server) | GitHub Actions → Docker Hub → SSH → Docker Compose, **only when `backend/` changes** |
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
4. Environment variables (copy from `frontend/.env.example` once it exists):

   | Key | Value |
   |---|---|
   | `VITE_BASE_URL` | `https://13.207.134.130.nip.io/v1` (same backend URL as before) |
   | `VITE_WALLETCONNECT_PROJECT_ID` | from cloud.reown.com |
   | `VITE_ARKIV_ACCESS_KEY` | from hub.arkiv.network (add the Vercel domain to the key's **Origins**) |
   | `VITE_OTC_CONTRACT_ARC_TESTNET`, `VITE_PREMARKET_CONTRACT_ARC_TESTNET`, … | contract addresses from Arc Studio |
   | `VITE_SEPOLIA_RPC_URL` | Sepolia RPC (ENS) |

5. Add `frontend/vercel.json` so page refreshes don't return 404:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
6. Optional: skip frontend builds when only other folders change. Vercel → Settings → Git → **Ignored Build Step**:
   ```bash
   git diff HEAD^ HEAD --quiet -- .
   ```
   (This runs inside the Root Directory, so `.` means `frontend/`.)
7. If an old SettleX Vercel project exists, delete it (or remove its domain) once the new one is live.

---

## 3. Backend on the existing AWS server (replacing the old SettleX backend)

### How the swap works
The new workflow deploys into the **same EC2 server, same `APP_DIR`, same nginx and HTTPS certificate**. Docker Compose sees the same project and replaces the old `app` container with the new image. The URL stays `https://13.207.134.130.nip.io`.

### 3.1 Before the first deploy
1. **Turn off the old repo's workflow** so it can't redeploy the old backend:
   GitHub → old `SettleX-backend` repo → **Settings → Actions → General → Disable actions**.
2. The new backend must:
   - listen on port **3000** (nginx proxies to `app:3000`)
   - expose **`GET /health`** returning `{"status":"ok", …}` (the workflow's health check looks for it)
   - have `backend/Dockerfile`, `backend/docker-compose.yml` and `backend/nginx/nginx.conf`

   > These three infrastructure files can be adapted from the old SettleX backend. If you reuse them, list them under **Pre-existing work** in the README, because they existed before the hackathon.

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

**New app settings (from the build plan):**

| Secret | Value |
|---|---|
| `NODE_ENV` / `PORT` / `BASE_URL` | `production` / `3000` / `https://13.207.134.130.nip.io` |
| `ARC_RPC_URL` | `https://rpc.testnet.arc.io` |
| `SEPOLIA_RPC_URL` | Sepolia RPC (ENS) |
| `ARKIV_ACCESS_KEY` | Arkiv Hub key (lock it to the server IP with the **IP allowlist**) |
| `PLATFORM_PRIVATE_KEY` | **testnet-only** key for the keeper and ENS admin |
| `OTC_CONTRACT`, `PREMARKET_CONTRACT`, `BROKER_REGISTRY` | Arc Testnet addresses |
| `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET` | optional: Circle Dev-Controlled Wallet + Gas Station for the keeper |

Add or remove rows to match what the backend actually reads.

### 3.3 Workflow file: `.github/workflows/deploy-backend.yml`
Add this **once `backend/Dockerfile` exists**. It's the old SettleX workflow with four changes:
1. It runs **only when `backend/**` changes**.
2. The Docker build context is **`./backend`**.
3. The image is named **`pre-settle-backend`**.
4. It writes the **new `.env` keys**, and copies files from `backend/` with **`strip_components: 1`**.

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - ".github/workflows/deploy-backend.yml"
  workflow_dispatch:

env:
  DOCKER_IMAGE: ${{ secrets.DOCKER_HUB_USERNAME }}/pre-settle-backend

jobs:
  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.DOCKER_IMAGE }}
          tags: |
            type=raw,value=latest
            type=sha,prefix=sha-
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to AWS EC2
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Write .env to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          port: ${{ secrets.SERVER_PORT }}
          script: |
            set -e
            APP_DIR="${{ secrets.APP_DIR }}"
            mkdir -p "$APP_DIR"
            ENV_FILE="$APP_DIR/.env"
            printf 'NODE_ENV=%s\n'             '${{ secrets.NODE_ENV }}'             >  "$ENV_FILE"
            printf 'PORT=%s\n'                 '${{ secrets.PORT }}'                 >> "$ENV_FILE"
            printf 'BASE_URL=%s\n'             '${{ secrets.BASE_URL }}'             >> "$ENV_FILE"
            printf 'ARC_RPC_URL=%s\n'          '${{ secrets.ARC_RPC_URL }}'          >> "$ENV_FILE"
            printf 'SEPOLIA_RPC_URL=%s\n'      '${{ secrets.SEPOLIA_RPC_URL }}'      >> "$ENV_FILE"
            printf 'ARKIV_ACCESS_KEY=%s\n'     '${{ secrets.ARKIV_ACCESS_KEY }}'     >> "$ENV_FILE"
            printf 'PLATFORM_PRIVATE_KEY=%s\n' '${{ secrets.PLATFORM_PRIVATE_KEY }}' >> "$ENV_FILE"
            printf 'OTC_CONTRACT=%s\n'         '${{ secrets.OTC_CONTRACT }}'         >> "$ENV_FILE"
            printf 'PREMARKET_CONTRACT=%s\n'   '${{ secrets.PREMARKET_CONTRACT }}'   >> "$ENV_FILE"
            printf 'BROKER_REGISTRY=%s\n'      '${{ secrets.BROKER_REGISTRY }}'      >> "$ENV_FILE"
            printf 'DOCKER_IMAGE=%s\n'         '${{ secrets.DOCKER_HUB_USERNAME }}/pre-settle-backend:latest' >> "$ENV_FILE"
            chmod 600 "$ENV_FILE"
            echo "[✓] .env written (keys):"; cut -d= -f1 "$ENV_FILE"

      # The Let's Encrypt certificate for <SERVER_HOST>.nip.io already exists on the
      # server from the old backend. Copy the "Obtain Let's Encrypt Certificate" step
      # from the old workflow here too if you ever move to a new server.

      - name: Copy compose + nginx config
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          port: ${{ secrets.SERVER_PORT }}
          source: "backend/docker-compose.yml,backend/nginx/nginx.conf"
          target: ${{ secrets.APP_DIR }}
          strip_components: 1   # backend/docker-compose.yml → APP_DIR/docker-compose.yml

      - name: Deploy with Docker Compose
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          port: ${{ secrets.SERVER_PORT }}
          script: |
            set -e
            cd "${{ secrets.APP_DIR }}"
            echo "${{ secrets.DOCKER_HUB_TOKEN }}" | docker login -u "${{ secrets.DOCKER_HUB_USERNAME }}" --password-stdin
            docker compose pull app
            docker compose up -d --remove-orphans   # replaces the old SettleX container
            docker compose restart nginx
            docker image prune -f
            docker compose ps

      - name: Health check
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          port: ${{ secrets.SERVER_PORT }}
          script: |
            DOMAIN="${{ secrets.SERVER_HOST }}.nip.io"
            for i in $(seq 1 12); do
              if curl -s --max-time 5 "https://$DOMAIN/health" | grep -q '"status":"ok"'; then
                echo "[✓] https://$DOMAIN is live"; exit 0
              fi
              sleep 5
            done
            echo "[!] health check failed"; cd "${{ secrets.APP_DIR }}" && docker compose logs --tail=50 app; exit 1
```

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
