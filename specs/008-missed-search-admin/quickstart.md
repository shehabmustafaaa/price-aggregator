# Quickstart: Missed-Search Admin View

## Prerequisites

- `web` running locally; an admin account (`npx tsx scripts/make-admin.ts <email>`).
- Some `missed_searches` rows — generate by running zero-result searches at `/ar/search?q=…`
  and `/en/search?q=…`, repeating a couple of terms and using an Arabic alef variant for one
  term across two searches.

## Scenario 1 — Ranked aggregated list (US1)

1. As admin, open `/en/admin/missed-searches`.
2. Confirm each distinct term appears once, with count, locale(s), and last-searched time,
   ordered by count descending (highest at top). → SC-001, SC-002, US1/AC1.

## Scenario 2 — Normalization collapses variants (FR-004, SC-002)

1. Ensure two logged searches differ only by case/whitespace/alef form of the same term.
2. Confirm they appear as a single row with count = 2, not two near-duplicate rows.

## Scenario 3 — Gating (FR-001, SC-004, US1/AC2)

1. Visit `/en/admin/missed-searches` while signed out (or as a non-admin).
2. Confirm the standard admin gate shows, not the data.

## Scenario 4 — Dismiss (US2)

1. From the populated list, dismiss the top term.
2. Confirm it disappears and does not return on reload (FR-005, SC-003).
3. For a term searched under both locales, confirm dismissing clears the whole row
   regardless of locale (US2/AC2).

## Scenario 5 — Empty state (FR-006, US1/AC3, US2/AC3)

1. Dismiss all terms (or start with an empty `missed_searches` table).
2. Confirm a clear empty-state message renders (no error, no blank page).

## Scenario 6 — Read-only (FR-007)

1. After using the page (including dismiss), confirm no product/variant/offer/store/scrape
   records were created or changed (check `/admin/catalog` and `/admin/scraper`) — the only
   change is fewer `missed_searches` rows.
