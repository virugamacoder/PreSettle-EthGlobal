# scripts

The Arkiv scripts live in the backend so they reuse its dependencies and schemas:

- **Runnable query for Arkiv judges** (read-only, no key needed):
  ```bash
  cd backend && npm install
  node scripts/arkiv-query.js              # whole Pre Settle order book
  node scripts/arkiv-query.js 0xWallet     # only entities owned by that wallet
  ```
  Source: [backend/scripts/arkiv-query.js](../backend/scripts/arkiv-query.js)
- **Curated token list:** published from the Admin page (Token list section) by the list admin wallet.
