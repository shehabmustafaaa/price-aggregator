# Quickstart: Catalog & Price Comparison

**Status**: Baseline validation guide for already-built behavior. No automated test suite
exists yet (`BACKLOG.md`); this is the manual verification path.

## Prerequisites

- Local PostgreSQL db `price_aggregator` with migrations applied and seed data loaded:
  ```bash
  cd web
  npx prisma migrate dev
  npx tsx prisma/seed.ts
  ```
- At least one product with ≥2 fresh offers across ≥2 stores. Fastest way to get one: run the
  scraper's mock pipeline against local `web` (see [[005-scraping-ingest]]'s quickstart), or
  manually POST a couple of offers to `/api/ingest` with `x-ingest-secret` matching
  `INGEST_SECRET` in `web/.env`.
- `npm run dev` in `web/` (http://localhost:3000).

## Scenario 1 — Cross-store comparison renders correctly

1. Open `/ar/p/<slug>` (or `/en/p/<slug>`) for a product with fresh offers from ≥2 stores.
2. Confirm offers are grouped by storage variant and ranked by price ascending.
3. Confirm each offer row shows store name, EGP price, warranty/version type, and stock
   status.
4. **Expected**: matches spec.md User Story 1, Acceptance Scenario 1.

## Scenario 2 — Color selection highlights the right best price

1. On a product page with offers in ≥2 colors, select a color.
2. Confirm the best (lowest) price shown updates to reflect only that color's fresh offers,
   and product images switch to that color's gallery.
3. **Expected**: matches Acceptance Scenario 2.

## Scenario 3 — Freshness gate hides stale offers everywhere

1. Pick an offer and update its `lastSeenAt` in the DB to >24h ago (or wait for it to age out
   naturally without a re-scrape).
2. Reload the product page, its category page, and any deals/search surface it would
   otherwise appear on.
3. **Expected**: the offer is absent from all of them — matches Acceptance Scenario 3 and the
   `freshOfferWhere()` invariant in data-model.md.

## Scenario 4 — Outbound click tracking

1. From a product page, click "Go to store" on any offer.
2. **Expected**: browser is redirected (302) to the offer's `url`; a new row exists in
   `outbound_clicks` for that `offerId` with the current timestamp — matches Acceptance
   Scenario 4.
3. Repeat after manually aging that offer's `lastSeenAt` past 24h (but not deleting it) —
   **Expected**: the redirect still succeeds (per the documented freshness-gate exception in
   research.md), even though the offer would no longer appear in listings.

## Scenario 5 — Product with zero fresh offers still renders

1. Pick (or create) a product where every offer is stale or absent.
2. Open its product page.
3. **Expected**: name, images, and specs render; no price or offer rows are shown, and the
   page does not error — matches Acceptance Scenario 5.

## Scenario 6 — Site-wide baseline

1. Load any page fresh (no prior theme preference stored).
2. **Expected**: dark theme by default, RTL layout on `/ar` routes, responsive layout at
   mobile viewport width, and the site is installable (browser's "Install app" prompt / PWA
   manifest present at `/manifest.webmanifest` reachable via `web/src/app/manifest.ts`).
3. Load `/ar/about` (or equivalent About route) — **Expected**: static page renders.
