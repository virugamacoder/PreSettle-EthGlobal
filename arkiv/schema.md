# Arkiv schema

For each entity: columns (and which are indexed, and why), owner, and expiry rule.

| Schema | Owner | Expires | Indexed columns |
|---|---|---|---|
| `settlex.otc_order.v1` | maker | order deadline | _TBD_ |
| `settlex.pm_offer.v1` | seller | TGE + delivery window | _TBD_ |
| `settlex.broker_link.v1` | broker | 10 minutes | _TBD_ |
| `settlex.fill.v1` (read-only) | taker | 90 days | _TBD_ |
| `settlex.profile.v1` | trader | 180 days, extended on login | _TBD_ |
| `settlex.token.v1` | admin | max, re-extended | _TBD_ |

Example query text (`toString()`): _TBD_
