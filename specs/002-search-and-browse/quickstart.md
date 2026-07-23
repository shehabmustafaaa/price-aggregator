# Quickstart: Search & Browse

**Status**: Baseline validation guide. No automated test suite exists yet (`BACKLOG.md`).

## Prerequisites

- Same as [[001-catalog-comparison]]'s quickstart: local DB migrated + seeded, `npm run dev`
  in `web/`, at least one product with offers from ≥2 stores (ideally with differing raw
  listing titles, to exercise cross-store wording search).

## Scenario 1 — Arabic spelling-variant search

1. Note a seeded product's stored Arabic name (e.g. one using a specific alef form).
2. Search `/ar/search?q=<alternate-spelling>` using a different alef/hamza form of the same
   word.
3. **Expected**: the product is found — matches spec.md Acceptance Scenario 1.

## Scenario 2 — Search by a store's own wording

1. Find a product with an offer whose `titleRaw` differs from the catalog name (check the DB
   or admin catalog view).
2. Search using a distinctive word from that `titleRaw`.
3. **Expected**: the product is found even though the query doesn't match the catalog name
   directly — matches Acceptance Scenario 2.
4. Age that same offer past 24h staleness and repeat the search.
   **Expected**: the product is still found (search index isn't freshness-gated), but its
   product page no longer shows that particular offer's price (per
   [[001-catalog-comparison]]'s freshness gate).

## Scenario 3 — Category browse, pagination, filters

1. Open `/ar/c/<category-slug>` with enough products to span multiple pages.
2. Page through results; confirm the product set changes per page and totals are consistent.
3. Apply a brand filter — confirm only that brand's products remain.
4. Apply a price range and/or a spec filter (RAM/storage) — confirm results narrow correctly.
5. **Expected**: matches Acceptance Scenario 3.

## Scenario 4 — Zero-result logging

1. Search for an obviously nonexistent query string.
2. **Expected**: zero results shown to the user; a new row appears in `missed_searches` with
   that query text and the current locale — matches Acceptance Scenario 4.
