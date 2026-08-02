# Quickstart: Recently-Viewed Products

## Prerequisites

- `web` running locally (`npm run dev`); some seeded products.
- A normal browser window (for the storage-disabled case, use private/incognito or block
  storage for the site).

## Scenario 1 — Strip shows viewed products, newest first (US1/AC1)

1. Open three different product pages in turn.
2. Go to the home page.
3. Expect a "recently viewed" strip listing those three, most-recently-viewed first, each
   with name + image; clicking one opens that product. → SC-001.

## Scenario 2 — Dedupe to front on re-view (US1/AC2, SC-002)

1. Re-open one of the earlier products.
2. Return to the home page → that product is now first, and appears only once (no duplicate).

## Scenario 3 — Cap (US1/AC3, FR-004)

1. View more than 12 distinct products.
2. Expect the strip to hold only the 12 most-recent; the oldest drop off.

## Scenario 4 — Persistence across restart (US1/AC4, SC-003)

1. With some products viewed, fully close and reopen the browser (same profile).
2. Open the home page → the recently-viewed strip is still populated.

## Scenario 5 — Self-exclusion on a product's own page (FR-006)

1. Open product A's page.
2. Its own recently-viewed strip does **not** list A (but other viewed products appear).

## Scenario 6 — Locale/RTL (FR-006)

1. View products, then switch to `/ar`.
2. The strip renders Arabic names, right-to-left, for the same products.

## Scenario 7 — Empty / storage-disabled (FR-007, SC-005)

1. In a fresh profile with nothing viewed → no strip renders (no empty box/error).
2. In private mode / storage blocked → product and home pages work normally, strip simply
   absent, no console error that breaks the page.

## Scenario 8 — No price, no server (FR-008, SC-004)

1. Confirm the strip shows name + image only (no price).
2. With devtools Network open, confirm viewing products / rendering the strip issues **no**
   request carrying recently-viewed data, and no DB row is created.
