# Arkiv schema

Source: [backend/src/arkiv/schemas.js](../backend/src/arkiv/schemas.js) (the frontend uses an identical copy).

All entities use **named schemas** (`settlex.*.v1`). The schema tag is not a security boundary, so every read also filters by owner/creator, and orders are verified against the Arc contracts before display. Only columns used in filters are indexed, because indexes add cost to every write.

| Schema | Owner | Expires | Indexed columns (filterable) | Other columns |
|---|---|---|---|---|
| `settlex.otc_order.v1` | maker | at the order **deadline** | `maker`, `side`, `offerToken`, `wantToken`, `price`, `partial`, `orderId`, `deadline` | `amount`, `broker?`, `brokerEns?`, `makerEns?`, `arcTx`, `termsRef?` |
| `settlex.pm_offer.v1` | seller | at **TGE + delivery window** | `seller`, `marketId`, `symbol`, `collateralToken`, `price`, `offerId`, `tge` | `tokenAmount`, `arcTx` |
| `settlex.broker_link.v1` | broker | **10 minutes** after creation | `broker`, `client` | `brokerEns`, `offerToken`, `wantToken`, `price`, `amount`, `feeBps` |
| `settlex.fill.v1` (read-only) | taker | 90 days | `market`, `refId`, `taker`, `maker` | `orderKey?`, `amount`, `price`, `arcTx` |
| `settlex.profile.v1` | trader | 180 days, extended on login | `ens` | `prefTokens?`, `minSize?`, `bio?` |
| `settlex.token.v1` | admin wallet | max lifetime, re-extended | `kind`, `address`, `symbol` | `name`, `decimals`, `logo?` |

`?` = optional column.

## Example query

Sell orders priced at or below 100 (the text the node receives, from `query.toString()`):

```
arkiv.schema = str('settlex.otc_order.v1') AND side = str('sell') AND price <= dec(100)
```
