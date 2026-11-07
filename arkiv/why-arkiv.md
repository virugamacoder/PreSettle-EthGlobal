# Why Arkiv

## What would users lose on Postgres?

1. **Ownership.** With Postgres, we (the platform) own every row and could edit a price, hide an order or fake volume. On Arkiv, each listing is owned by the **maker's wallet**: only that wallet can change or delete it.
2. **Proof of history.** A Postgres "trade history" is whatever the operator says it is. Our fill records are Arkiv entities created **read-only** by the taker's wallet: they can't be edited afterwards.
3. **Openness.** With Postgres, only our API can read the order book. On Arkiv, **anyone** can query it directly (see `backend/scripts/arkiv-query.js`), and other apps or bots could build on the same data.
4. **Survival.** If our server goes down, a Postgres order book is gone. The Arkiv order book stays readable, and the money stays in the Arc escrow.
5. **Automatic cleanup.** In Postgres we'd need cron jobs to hide expired orders. On Arkiv, a listing's expiry **is** its deadline: it disappears from every query by itself.

## What we kept off Arkiv, and why

| Data | Where instead | Why |
|---|---|---|
| Locked funds, fills, settlement, refunds, fees | Arc escrow contracts | Money needs contract-enforced guarantees |
| Live token prices | Backend memory (CoinMarketCap, 5-min cache) | Changes every second; storing it would be wasteful |
| Page view counts | Backend file storage | Changes on every page view; one transaction per view would be too much |
| Uploaded logos | Backend file storage (URL stored in the Arkiv entity) | Images are large |
| Private contact details | Nowhere | Arkiv data is public |
