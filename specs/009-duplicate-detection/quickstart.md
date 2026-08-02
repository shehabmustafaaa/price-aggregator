# Quickstart: Duplicate-Product Detection & Merge Suggestions

## Prerequisites

- `web` running locally; admin account (`npx tsx scripts/make-admin.ts <email>`).
- The migration applied: `cd web && npx prisma migrate dev`.
- At least two near-duplicate products in one category+brand — easiest is to let the scrapers
  auto-create, or seed two products with the same brand and near-identical names (e.g.
  "Samsung Galaxy A56 5G" vs "Galaxy A56") in the same category.

## Scenario 1 — Ranked candidate list (US1)

1. As admin, open `/en/admin/catalog/duplicates`.
2. Confirm the near-duplicate pair appears once, most-similar first, each side showing name,
   brand, image, offer/variant counts, and a score. → SC-001, US1/AC1.

## Scenario 2 — Category isolation (US1/AC4, SC-005)

1. Create two same-named products in **different** categories.
2. Reload the page → they are **not** offered as a pair.

## Scenario 3 — Gating (FR-001, SC-004, US1/AC2)

1. Visit the page signed out / as a non-admin → standard admin gate, no data.

## Scenario 4 — Merge in place (US2)

1. On a pair, click **Merge → keep A** (or B).
2. Confirm: the survivor now carries both products' offers/variants/history; the absorbed
   product is gone (its old URL 404s); the pair disappears and doesn't return on reload. →
   SC-002, US2/AC1–AC2.

## Scenario 5 — Dismiss a false positive (US3)

1. On a pair you judge to be different (e.g. a 4G vs 5G lookalike), click **Not a duplicate**.
2. Confirm it disappears and does **not** reappear on reload or after the list recomputes
   (both products still exist). → SC-003, US3/AC1–AC2.

## Scenario 6 — Empty state (FR-007)

1. Dismiss/merge all candidates (or start with a catalog that has none).
2. Confirm a clear empty state renders (no error/blank).

## Scenario 7 — Read-only except merge/dismiss (FR-010)

1. After using the page, confirm no product fields changed and no scrape ran — the only
   effects are the merge (via the existing tool) and any `duplicate_dismissals` rows.

## Scenario 8 — Stale dismissal is harmless (US3/AC3)

1. Dismiss a pair, then delete one of its products via `/admin/catalog`.
2. Reload the duplicates page → no error; the stale dismissal simply no longer applies.
