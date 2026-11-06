# SettleX

**Trustless OTC and pre-launch (premarket) trading, settled in stablecoins.**

- **Money** is locked in USDC/EURC escrow contracts on **Arc**.
- **Brokers** are verified with **ENSv2** names.
- **The order book** is open, wallet-owned data on **Arkiv**.

> Built at **ETHGlobal Mumbai 2026**. All code in this repository was written during the hackathon.

## Status

🚧 In progress.

## Prize tracks

| Sponsor | Prize |
|---|---|
| Arc | Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio |
| ENS | Best Use of ENSv2 |
| Arkiv | Build on Arkiv (from scratch) |

## Repository layout

| Folder | What it holds |
|---|---|
| [contracts/](contracts/) | Solidity contracts, built in Arc Studio and deployed to Arc Testnet |
| [frontend/](frontend/) | React + Vite + wagmi web app |
| [backend/](backend/) | Slim Node service: order verification, keeper, broker admin |
| [ens/](ens/) | ENSv2 setup scripts (Sepolia) |
| [scripts/](scripts/) | Arkiv seed and query scripts |
| [arkiv/](arkiv/) | Arkiv judging documents |
| [docs/](docs/) | Build plan and architecture |

## Links

| | |
|---|---|
| Live demo | _TBD_ |
| Arc Studio project | _TBD_ |
| Demo video | _TBD_ |
| Contract addresses (Arc Testnet) | _TBD_ |
| Arkiv writer wallets + query | _TBD_ |

## Pre-existing work

The team built an earlier, separate product called SettleX before this event. **No code from it is included here.** It was used only as a reference for the product idea and business rules. Any pre-existing non-code assets (logo, fonts) will be listed here if added.

## AI usage

- Planning and documentation were drafted with **Claude Code** (Anthropic).
- Smart contracts are generated, tested and audited with **Arc Studio** (an AI agent), then reviewed by the team.
- Commits made with AI assistance carry a `Co-Authored-By` trailer.

## License

[MIT](LICENSE)
