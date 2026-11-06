# contracts

Solidity escrow contracts for Pre Settle on **Arc Testnet** (chain 5042002).

| Contract | File | What it does |
|---|---|---|
| `OTCMarket` | [contracts/OpenMarket.sol](contracts/OpenMarket.sol) | OTC orders: maker escrows tokens, takers fill at an on-chain price, cancel / permissionless expire, pull-payment withdrawals |
| `PremarketMarket` | [contracts/PreMarket.sol](contracts/PreMarket.sol) | Pre-TGE sales with 100% seller collateral: buy, deliver in the window, claim default, reclaim unsold |
| `TestToken` | [contracts/Mock/TestToken.sol](contracts/Mock/TestToken.sol) | Mintable 18-decimal ERC-20 for tests and the demo "XYZ" token |

The interface the app relies on is in [docs/CONTRACT_INTERFACE.md](../docs/CONTRACT_INTERFACE.md).

## Setup

```bash
npm install
cp .env.example .env    # set NETWORK=arc_testnet, ARC_TESTNET_RPC_URL, ARC_TESTNET_ACCOUNT_PRIVATE_KEY (testnet only)
```

## Compile and test

```bash
npx hardhat compile     # also exports the ABIs to ../frontend/src/contracts/abi and ../backend/src/contracts/abi
npx hardhat test        # OTCMarket + PremarketMarket test suites
```

Commit the exported ABI files together with any contract change, so the app always matches the contracts.

## Deploy to Arc Testnet

Constructor arguments come from [ignition/parameters/arc-testnet.json](ignition/parameters/arc-testnet.json): owner (the Admin page's wallet: it receives platform fees and creates premarket markets), platform fee in bps (max 100), and the Arc USDC/EURC addresses.

```bash
npx hardhat ignition deploy ignition/modules/OTCMarket.js       --network arc_testnet --parameters ignition/parameters/arc-testnet.json
npx hardhat ignition deploy ignition/modules/PremarketMarket.js --network arc_testnet --parameters ignition/parameters/arc-testnet.json
npx hardhat ignition deploy ignition/modules/DemoToken.js       --network arc_testnet   # optional demo "XYZ" token
```

Arc drops transactions with `maxFeePerGas` below 20 gwei; if a deploy hangs, raise the gas price.

After deploying:
1. Record the addresses, deploy tx hashes and deploy block in `deployments/arc-testnet.json`.
2. Set them in Vercel (`VITE_OTC_CONTRACT_ARC_TESTNET`, `VITE_PREMARKET_CONTRACT_ARC_TESTNET`, then redeploy) and in the backend's `BACKEND_ENV_FILE` (`OTC_CONTRACT`, `PREMARKET_CONTRACT`, then run the deploy workflow). The Admin page's configuration check confirms both sides match.
3. From the owner wallet (Admin page): create a premarket market, for example TGE in about 10 minutes with a 3–5 minute delivery window for a demo.
