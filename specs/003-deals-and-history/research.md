# Phase 0 Research: Deals & Price History

**Status**: Baseline — verified against `web/src/lib/catalog/deals.ts` and
`getPriceHistory` in `web/src/lib/catalog/offers.ts`. No `NEEDS CLARIFICATION` markers.

## Decision: Deals/price-drops use raw SQL, not the Prisma query builder

- **Decision**: `getBestDeals()` and `getPriceDrops()` use `prisma.$queryRaw` with
  parameterized tagged templates, doing `GROUP BY`/`HAVING`/`LATERAL JOIN` aggregation
  server-side in Postgres.
- **Rationale**: "Cheapest and most expensive fresh offer per product+storage, across stores,
  with a plausibility cap on the spread" and "current price vs. this offer's own 30-day max"
  are set-aggregation queries that don't map cleanly onto Prisma's query-builder API; writing
  them in SQL is simpler and more efficient than fetching all offers and aggregating in JS.
- **Alternatives considered**: Application-code aggregation (fetch offers, group in JS) was
  rejected — it would pull far more rows than needed just to compute a `MIN`/`MAX`/`GROUP BY`
  that Postgres does natively and efficiently.

## Decision: Freshness/active predicate is duplicated in SQL, not called via `freshOfferWhere()`

- **Decision**: Both raw queries inline `o.last_seen_at >= now() - interval '24 hours' AND
  s.active = true` rather than importing `freshOfferWhere()` from
  [[001-catalog-comparison]].
- **Rationale**: `freshOfferWhere()` returns a Prisma `where` object for the query builder;
  `$queryRaw` takes a SQL string, so the object can't be spread into it. There is no
  Prisma-supported way to share the *shape* of that predicate between builder queries and raw
  SQL without hand-rolling a SQL-fragment helper — which the codebase hasn't done.
- **Consequence (recorded, not resolved here)**: `OFFER_STALE_HOURS` (24h) is a named
  constant in `offers.ts`, but these two raw queries hardcode `interval '24 hours'`
  independently. Changing the threshold requires updating three places, not one. This is
  flagged as a known deviation from constitution III's "one shared gate" intent, not silently
  ignored.
- **Alternatives considered**: A Postgres view or function encoding the freshness predicate
  was considered (would fix the duplication at the SQL layer) but rejected as
  over-engineering for a two-query duplication at current scale (constitution VII); worth
  revisiting if a third raw-SQL consumer of freshness appears.

## Decision: 45% spread cap is a single named constant, enforced in SQL

- **Decision**: `MAX_PLAUSIBLE_SPREAD = 0.45` in `deals.ts`, interpolated into the `HAVING`
  clause of `getBestDeals()`'s query.
- **Rationale**: Cross-store spreads above ~45% are, in practice, almost always a matching
  artifact (two different configs collapsed onto one product) rather than a real deal —
  documented in the source comment. Filtering in SQL (`HAVING`) means implausible rows never
  leave the database, rather than being computed and then filtered in JS.
- **Alternatives considered**: Applying the cap in application code after fetching all
  candidate deals was rejected as strictly worse — it would need to over-fetch to backfill
  after filtering, whereas the `HAVING` clause + `LIMIT limit*3` heuristic (to leave enough
  rows after per-product dedup) already handles this in one query.

## Decision: Price history is a flat 90-day read, not pre-aggregated

- **Decision**: `getPriceHistory(productId, days=90)` returns raw `price_history` rows
  (offerId, price, recordedAt, inStock) for the window; the "daily lowest" reduction happens
  client/render-side, not in this query.
- **Rationale**: Keeps the query simple and reusable (the same rows could support other chart
  shapes later) versus baking one specific aggregation into SQL.
- **Alternatives considered**: A `GROUP BY date_trunc('day', recorded_at)` aggregation in SQL
  was considered but not necessary yet — chart-shaping logic living in the render layer is
  simpler while the data volume is small (constitution VII).

## Open questions

None — baseline of already-built, already-verified behavior.
