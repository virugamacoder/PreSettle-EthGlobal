# How we use Arkiv

## Filters users actually use
Only fields with a filter in the UI are indexed (each index costs on every write).

| Screen | Filter | Arkiv query |
|---|---|---|
| OTC page | Buy / Sell tabs | `eq("side", …)` |
| OTC page | Token dropdown | `eq("offerToken", …)` / `eq("wantToken", …)` |
| OTC page | Max price | `lte("price", dec(…))` |
| OTC page | Partial fills only | `eq("partial", true)` |
| Premarket page | Token tabs | `eq("symbol", …)` |
| Dashboard | My orders, my offers, my fills | `.ownedBy(wallet)` |
| Every token dropdown | Curated token list | `.createdBy(adminWallet)` |
| Backend paging | Next page | `gt("$key", lastKey)` with `orderBy(asc("$key"))` |

Example (what the node receives):
```
arkiv.schema = str('presettle.otc_order.v1') AND side = str('sell') AND price <= dec(100)
```

## Who can edit each entity
- **Owner only:** the wallet that signed the write. The platform never writes on a user's behalf.
- **Fills are created read-only** (`flags: { readonly: true }`), so trade history can't be changed, even by its owner.
- **The token list** is written only by the admin wallet, and read with `createdBy(admin)`, so entries copied by someone else are ignored.

## Expiry matches the app

| Entity | Expires | Why |
|---|---|---|
| OTC order | `ExpirationTime.atDate(deadline)` | The listing disappears exactly when the order can no longer be filled |
| Premarket offer | after TGE + delivery window (capped at the max lifetime) | Not needed after settlement |
| Fill | 90 days | Track record |
| Profile | 180 days, extended on each save (patch + extend in one `executeBatch`) | Active traders stay listed |
| Token list entry | maximum lifetime | A curated list |

## See it live

- An OTC order that expires at its deadline: [`0x2e0f2e3f…`](https://rabdi.explorer.arkiv.network/entity/0x2e0f2e3f7c8b533f4c3045f595bc23a59adef8ad6fa4423c6af0ea174315bd2a)
- A read-only fill record: [`0xe0e2e89d…`](https://rabdi.explorer.arkiv.network/entity/0xe0e2e89d9c78b4d09a27cd3fe75b354c33165d695d3746b735e53b2a9c465b06)
- A token-list entry written by the admin wallet: [`0xdaf80fe3…`](https://rabdi.explorer.arkiv.network/entity/0xdaf80fe3364cc09a8eeb844f109aadcb1f9c247c2e79688c0077a6fe4968d43d)
- Code: [schemas](../frontend/src/arkiv/schemas.js) · [order write with expiry](../frontend/src/lib/otcActions.js) · [read-only fill](../frontend/src/pages/OtcDetails.jsx) · [verification on Arc](../backend/src/services/orders.js) · [keeper](../backend/src/keeper.js)

## Anti-spoofing
The schema name is not a security boundary: anyone can write an entity with our tag. So the backend checks **every** OTC listing against the Arc escrow before showing it: the Arkiv owner must be the on-chain maker, and the order must still be open. Anything else is dropped.

## Arkiv feature → what users see

| Arkiv feature | What the user sees |
|---|---|
| Expiry at a date | Orders vanish from the OTC page at their deadline |
| Indexed filters | Buy/Sell tabs, token filter, max price, partial fills, premarket token tabs |
| `ownedBy` | Dashboard: my orders, my premarket offers, my fills |
| `createdBy` | Token dropdowns show only admin-approved tokens |
| Read-only flag | "My fills" records that can never change |
| `deleteEntity` | A cancelled order disappears immediately |
| `executeBatch` (patch + extend) | "Profile updated and extended for 180 days" |
| `$createdAt` | 24 h fills, volume and trending tokens in the market stats |
| Entity `$key` | Every order and offer has a shareable URL (`/otc/<key>`, `/premarket/<key>`) |
