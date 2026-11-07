# Reach

## Who is it for?
- **OTC traders** who today agree deals in Telegram groups and have to trust a middleman with the money.
- **Pre-launch buyers and sellers** who want to trade a token before its launch (TGE) without counterparty risk: the seller's collateral protects the buyer.
- **Projects and communities** that want an open, verifiable order book other apps can read.

## Would they use it?
The core pain is trust: who holds the money, and whether listings and history are real. Pre Settle removes both: money sits in an Arc escrow, and listings and fills are wallet-owned Arkiv records the platform can't edit. Users need no new account, just a wallet with USDC.

## Can they try it today?
Yes: **https://presettle-ethglobal.vercel.app** (Arc Testnet + Arkiv Rabdi).
- OTC orders and premarket offers can be created, filled, cancelled and settled end to end.
- The live order book can be queried directly: `cd backend && npm install && node scripts/arkiv-query.js`.
- Test funds: Arc USDC from https://faucet.circle.com, tGLM from https://hub.arkiv.network/faucet.

## After Mumbai
- A full contract audit before any mainnet deployment.
- Live updates with Arkiv's entity events instead of polling.
- Buyer bids for premarkets (today only sellers create offers).
- ENS names for tokens and traders.
