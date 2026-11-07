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

**Live on Arkiv right now** (counts from `node scripts/arkiv-query.js`):

| Entity | Live | Example |
|---|---|---|
| OTC orders | 1 | [`0x2e0f2e3f…`](https://rabdi.explorer.arkiv.network/entity/0x2e0f2e3f7c8b533f4c3045f595bc23a59adef8ad6fa4423c6af0ea174315bd2a) |
| Premarket offers | 1 | [`0xc3b5c967…`](https://rabdi.explorer.arkiv.network/entity/0xc3b5c9673eb2ca259d99b8811723bdf529df207ca7add1870258c360a15c5571) |
| Fill records (read-only) | 2 | [OTC](https://rabdi.explorer.arkiv.network/entity/0xe0e2e89d9c78b4d09a27cd3fe75b354c33165d695d3746b735e53b2a9c465b06) · [premarket](https://rabdi.explorer.arkiv.network/entity/0x31fc3f522b256c532c60b8afbc548c629c9cfb47a2eb72c495c3893156bc18fb) |
| Token list entries | 2 | [`0xdaf80fe3…`](https://rabdi.explorer.arkiv.network/entity/0xdaf80fe3364cc09a8eeb844f109aadcb1f9c247c2e79688c0077a6fe4968d43d) |

Written by **2 wallets** (a maker/seller and a taker/buyer), through the live app.

## Will we keep building after Mumbai?

**Yes.** Next steps:
- A full contract audit before any mainnet deployment.
- Live updates with Arkiv's entity events instead of polling.
- Buyer bids for premarkets (today only sellers create offers).
- ENS names for tokens and traders.
