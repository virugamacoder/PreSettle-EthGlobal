# Arkiv friction log

Issues we hit while building, in the order we met them.

## 1. Rate limit made the page hang for ~40 seconds
- **What I tried:** reading the order book from the browser without an access key.
- **What I expected:** a quick error when over the limit.
- **What happened:** the RPC answered HTTP 429 `ANON_COST_LIMITED` with a long `Retry-After`. viem honoured it and retried, so the page froze for about 40 s.
- **How to reproduce:** `createPublicClient({ chain: rabdi({ accessKey: "" }), transport: http() })`, then run several queries in a row.
- **Suggested improvement:** fail fast on 429 by default in the SDK, or say clearly in the error that an access key is needed. (Our fix: `retryCount: 0` plus a 15 s timeout, then an access key.)

## 2. No event when an entity expires
- **What I tried:** refunding OTC orders on Arc once their Arkiv listing expired.
- **What I expected:** an event, or a query for "entities that just expired".
- **What happened:** the entity simply disappears; there is nothing to react to afterwards.
- **How to reproduce:** create an entity with `ExpirationTime.fromMinutes(1)`, wait, and try to find out it expired.
- **Suggested improvement:** an `EntityExpired` event or an "expired keys since block N" query. (Our workaround: the keeper caches each order's deadline while the listing is still live.)

## 3. The access key can leak into users' wallets
- **What I tried:** using `rabdi({ accessKey })` for both reads and wallet writes.
- **What I expected:** the key to stay in the app.
- **What happened:** the key is part of the RPC URL, so adding that chain to MetaMask would store our key in every user's wallet.
- **How to reproduce:** pass `rabdi({ accessKey: "…" })` to wagmi's `chains` and let the wallet add the network.
- **Suggested improvement:** document this, or provide a wallet-safe chain helper. (Our fix: two chain objects, one with the key for reads and one without for the wallet.)

## 4. Switching networks for every write
- **What I tried:** an OTC flow with Arc transactions followed by an Arkiv write.
- **What I expected:** a smooth single flow.
- **What happened:** users switch networks for each Arkiv write and need tGLM as well as USDC. Right after a switch, MetaMask sometimes still reported the old chain, causing "connector chain does not match" errors.
- **How to reproduce:** switch Arc → Arkiv and write immediately.
- **Suggested improvement:** sponsored or session-key writes, so users don't need tGLM or a network switch for small records. (Our fix: wait until the wallet reports the new chain, plus a "Retry the Arkiv step" button.)

## 5. Lifetime cap and no aggregates
- **What happened:** entities live at most ~182 days per create or extension, and there are no count/sum queries, so market stats page through up to 1,000 entities per type in our backend.
- **Suggested improvement:** simple aggregate queries (count, sum by field) would remove that client-side work.
