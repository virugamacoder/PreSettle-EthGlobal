# Arkiv schema

Source: [backend/src/arkiv/schemas.js](../backend/src/arkiv/schemas.js) (the frontend uses an identical copy).

All entities use **named schemas** (`presettle.*.v1`). The schema tag is not a security boundary, so every read also filters by owner/creator, and orders are verified against the Arc contracts before display. Only columns used in filters are indexed, because indexes add cost to every write.

| Schema | Owner | Expires | Indexed columns (filterable) | Other columns |
|---|---|---|---|---|
| `presettle.otc_order.v1` | maker | at the order **deadline** | `maker`, `side`, `offerToken`, `wantToken`, `price`, `partial`, `orderId`, `deadline` | `amount`, `broker?`, `brokerEns?`, `makerEns?`, `arcTx`, `termsRef?` |
| `presettle.pm_offer.v1` | seller | at **TGE + delivery window** | `seller`, `marketId`, `symbol`, `collateralToken`, `price`, `offerId`, `tge` | `tokenAmount`, `arcTx` |
| `presettle.broker_link.v1` (feature paused) | broker | **10 minutes** after creation | `broker`, `client` | `brokerEns`, `offerToken`, `wantToken`, `price`, `amount`, `feeBps` |
| `presettle.fill.v1` (read-only) | taker | 90 days | `market`, `refId`, `taker`, `maker` | `orderKey?`, `baseToken?`, `quoteToken?`, `symbol?`, `amount`, `price`, `arcTx` |
| `presettle.profile.v1` | trader | 180 days, extended on each save | `ens` | `prefTokens?`, `minSize?`, `bio?` |
| `presettle.token.v1` | admin wallet | maximum lifetime (~182 days) | `kind`, `address`, `symbol` | `name`, `decimals`, `logo?`, `cmcId?` |

`?` = optional column.

## Fields we query, and where

| Query | Used by |
|---|---|
| `side`, `offerToken` / `wantToken`, `price` (`lte`/`gte`), `partial` | OTC page filters (backend `/v1/orders`) |
| `symbol` | Premarket token tabs |
| `.ownedBy(wallet)` | Dashboard: my orders, my premarket offers, my fills; Settings profile |
| `.createdBy(admin)` | Token dropdowns (only admin-published tokens) |
| `$key` paging (`gt("$key", lastKey)`) | Backend order book, analytics and keeper |
| `$createdAt` | 24 h / 7 d fills and volume in the market stats |

## Live examples (Arkiv Rabdi explorer)

| Entity | Key | Owner |
|---|---|---|
| OTC order | [`0x2e0f2e3f…`](https://rabdi.explorer.arkiv.network/entity/0x2e0f2e3f7c8b533f4c3045f595bc23a59adef8ad6fa4423c6af0ea174315bd2a) | `0xfEce…d274` |
| Premarket offer | [`0xc3b5c967…`](https://rabdi.explorer.arkiv.network/entity/0xc3b5c9673eb2ca259d99b8811723bdf529df207ca7add1870258c360a15c5571) | `0xfEce…d274` |
| Fill (OTC, read-only) | [`0xe0e2e89d…`](https://rabdi.explorer.arkiv.network/entity/0xe0e2e89d9c78b4d09a27cd3fe75b354c33165d695d3746b735e53b2a9c465b06) | `0x3904…993F` |
| Fill (premarket, read-only) | [`0x31fc3f52…`](https://rabdi.explorer.arkiv.network/entity/0x31fc3f522b256c532c60b8afbc548c629c9cfb47a2eb72c495c3893156bc18fb) | `0x3904…993F` |
| Token list entry | [`0xdaf80fe3…`](https://rabdi.explorer.arkiv.network/entity/0xdaf80fe3364cc09a8eeb844f109aadcb1f9c247c2e79688c0077a6fe4968d43d) | `0xfEce…d274` |

## Example query

Sell orders priced at or below 100 (the text the node receives, from `query.toString()`):

```
arkiv.schema = str('presettle.otc_order.v1') AND side = str('sell') AND price <= dec(100)
```
