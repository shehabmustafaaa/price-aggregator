# Quickstart: Deals & Price History

**Status**: Baseline validation guide. No automated test suite exists yet (`BACKLOG.md`).

## Prerequisites

- Same as [[001-catalog-comparison]]'s quickstart, plus: at least one product with fresh
  offers from ≥2 stores at the *same* storage (for a deal to qualify), and ≥2 days of
  `price_history` rows on at least one offer (for a price drop / chart to have data).

## Scenario 1 — Deals page shows plausible, ranked spreads

1. Open `/ar/deals` (or `/en/deals`).
2. Confirm entries are ranked by savings percentage and every entry's spread is <45%.
3. Manually construct (in the DB) a same-product/same-storage pair of fresh offers with a
   >45% spread; reload the deals page.
   **Expected**: that pair does NOT appear — matches Acceptance Scenario 1 and the
   `MAX_PLAUSIBLE_SPREAD` invariant.

## Scenario 2 — Price drops reflect the 30-day high

1. Insert `price_history` rows for an offer showing a higher price within the last 30 days
   than its current price (>3% drop).
2. Reload `/ar/deals`.
   **Expected**: the product appears in price drops with both the old (30-day max) and new
   (current) price — matches Acceptance Scenario 2.

## Scenario 3 — 90-day price-history chart

1. Open a product page for a product with ≥2 days of `price_history`.
2. Confirm a daily-lowest-price chart renders, covering up to the last 90 days.
3. **Expected**: matches Acceptance Scenario 3.

## Scenario 4 — Freshness/active-store enforcement in raw SQL

1. Age an offer's `last_seen_at` past 24h (or set its store `active = false`).
2. Reload the deals page.
   **Expected**: that offer no longer contributes to any deal or price-drop row — confirms
   the hand-duplicated SQL predicate (see research.md) still matches
   [[001-catalog-comparison]]'s `freshOfferWhere()` behavior.
