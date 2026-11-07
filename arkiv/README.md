# arkiv

How Pre Settle uses **Arkiv** as its order book, and the documents for the Arkiv judges.

| File | Question it answers |
|---|---|
| [schema.md](schema.md) | Every entity type: owner, expiry, indexed fields |
| [why-arkiv.md](why-arkiv.md) | What users would lose on Postgres, and what we kept off Arkiv |
| [how-you-use-arkiv.md](how-you-use-arkiv.md) | Do the filters, edit rights and expiries fit the app? What does each Arkiv feature change for users? |
| [reach.md](reach.md) | Who it's for, can they try it today, what comes next |
| [friction.md](friction.md) | What was hard, with steps to reproduce and suggestions |

## In one paragraph
Pre Settle has **no database**. Every OTC order, premarket offer, fill record, trader profile and token-list entry is an Arkiv entity written by the user's own wallet, so the user owns it and nobody else can edit it. Listings **expire on Arkiv at their on-chain deadline**, fills are created **read-only**, the token list is trusted only via **`createdBy(admin)`**, and the backend checks every listing against the Arc escrow before showing it.

## Try it
```bash
cd backend && npm install && node scripts/arkiv-query.js              # the live order book
node scripts/arkiv-query.js 0xfEceA7b046b4DaFACE340c7A2fe924cf41b6d274  # one wallet's entities
```

**Wallets that wrote entities** (Arkiv Rabdi, chain 7794095):

| Wallet | Wrote |
|---|---|
| `0xfEceA7b046b4DaFACE340c7A2fe924cf41b6d274` | OTC order, premarket offer, token list |
| `0x3904a0bd83F6dB9e79AdFeE0A07B6341f59D993F` | Fill records |

Code: schemas in [frontend/src/arkiv/schemas.js](../frontend/src/arkiv/schemas.js) (same file in the backend), writes in [frontend/src/lib/otcActions.js](../frontend/src/lib/otcActions.js), verification in [backend/src/services/orders.js](../backend/src/services/orders.js), keeper in [backend/src/keeper.js](../backend/src/keeper.js).
