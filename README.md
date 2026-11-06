# SettleX

**Trustless OTC and pre-launch (premarket) trading, settled in stablecoins.**

- **Money** is locked in USDC/EURC escrow contracts on **Arc**.
- **Brokers** are verified with **ENSv2** names.
- **The order book** is open, wallet-owned data on **Arkiv**.

> Built at **ETHGlobal Mumbai 2026**. All code in this repository was written during the hackathon (see [Pre-existing work](#pre-existing-work)).

## Status

🚧 In progress. Backend and frontend are built; the smart contracts are being built in Arc Studio. See [docs/CONTRACT_INTERFACE.md](docs/CONTRACT_INTERFACE.md) for what the app expects from them.

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
| [docs/](docs/) | Build plan, architecture, [deployment guide](docs/DEPLOYMENT.md) |

## Links

| | |
|---|---|
| Live demo | _TBD_ |
| Arc Studio project | _TBD_ |
| Demo video | _TBD_ |
| Contract addresses (Arc Testnet) | _TBD_ |
| Arkiv writer wallets + query | _TBD_ |

## Pre-existing work

The team built an earlier, separate product called SettleX before this event. Its code is **not** included here; it was used only as a reference for the product idea and business rules. The new backend is deployed to the same AWS server the team already had.

Early in the event, that product's deployment configuration (Dockerfile, docker-compose, nginx config) was copied in as a starting point (commit `93bb81e`). It has since been replaced by new files written here.

## AI usage

- Planning and documentation were drafted with **Claude Code** (Anthropic).
- Smart contracts are generated, tested and audited with **Arc Studio** (an AI agent), then reviewed by the team.
- Commits made with AI assistance carry a `Co-Authored-By` trailer.

## License

[MIT](LICENSE)
