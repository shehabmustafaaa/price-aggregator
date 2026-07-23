# Phase 1 Data Model: Deals & Price History

**Status**: Baseline — reflects `web/prisma/schema.prisma` as built.

## Entities in scope

### PriceHistory

Append-only price point per offer: `offerId`, `price` (Decimal 12,2), `shippingCost`,
`inStock`, `recordedAt`. Written by [[005-scraping-ingest]]'s post-ingest hook on every
ingest that touches an offer; read-only here.

- **Invariant**: never updated or deleted — a full point-in-time series, which is what makes
  "30-day max" and "90-day daily-lowest chart" possible without a separate snapshot table.

### Derived: DealRow (not a table)

Computed by `getBestDeals()`: per `(productId, storage_gb)` group among currently-fresh,
active-store offers with ≥2 distinct stores, `minPrice`/`maxPrice`/`storeCount`, deduped to
one row per product (best-spread group wins), `savePct = round((1 - min/max) * 100)`.

- **Invariant**: `(maxPrice - minPrice) / maxPrice < 0.45` (`MAX_PLAUSIBLE_SPREAD`) — enforced
  in the SQL `HAVING` clause, never computed-then-filtered after the fact.

### Derived: PriceDropRow (not a table)

Computed by `getPriceDrops()`: for each currently-fresh, active-store offer whose price is
more than 3% below its own 30-day max (`ph.max_price > o.price * 1.03`), `currentPrice`,
`wasPrice` (the 30-day max), `dropPct`.

- **Invariant**: requires at least one `price_history` row for that offer within the last 30
  days with a higher price than current — an offer with no such history simply doesn't appear
  (not an error state).

## Derived values (not columns)

- **90-day daily-lowest series**: `getPriceHistory(productId, 90)` returns raw points; the
  product page reduces them to one lowest-price-per-day value for the chart. Requires ≥2 days
  of accumulated history to be meaningful (per spec.md edge case) — fewer than that is a
  render-layer decision (empty/placeholder state), not a query-layer one.

## State transitions

None owned by this domain — deals and history are pure read-time computations over data
[[005-scraping-ingest]] writes.
