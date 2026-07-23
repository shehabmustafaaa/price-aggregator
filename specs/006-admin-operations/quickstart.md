# Quickstart: Admin Operations

**Status**: Baseline validation guide. No automated test suite exists yet (`BACKLOG.md`).

## Prerequisites

- Local `web` running with migrated/seeded DB; a registered account promoted via
  `cd web && npx tsx scripts/make-admin.ts <email>`.
- Some scrape history (run `main.py mock` from [[005-scraping-ingest]]'s quickstart) so the
  scraper page and run detail have data.

## Scenario 1 — Gating (AC4 + edge case)

1. As an anonymous visitor, open `/ar/admin/scraper`. **Expected**: inaccessible.
2. Log in as a non-admin account and retry. **Expected**: still inaccessible.
3. Invoke an admin server action directly (e.g. re-POST a saved form without a session).
   **Expected**: rejected — gating is in the action, not the navigation.

## Scenario 2 — Scraper control plane (AC1)

1. As admin, open `/ar/admin/scraper`: all stores' enabled/interval/delay, recent jobs and
   runs with statuses, and the auto-approve toggle are visible.
2. Change a store's interval and save. **Expected**: redirect with `?saved=1`, value
   persists on reload, no browser resubmission prompt; interval below 15 min is clamped
   to 15.
3. Click Run-now. **Expected**: `?queued=1`; one PENDING job appears (repeat clicks don't
   stack duplicates).

## Scenario 3 — Run audit (SC-001)

1. Open a recent run's detail under `/ar/admin/scraper/runs/[id]`.
2. **Expected**: per-URL outcomes (grabbed / auto-created / skipped / rejected / review /
   error) with reasons, filterable by outcome — enough to diagnose any URL from the last 2
   days without server logs.

## Scenario 4 — Match review queue (AC2)

1. With auto-approve OFF, ingest an unmatched listing ([[005-scraping-ingest]] Scenario 6).
2. In `/ar/admin/review`, approve it (supplying nameEn/nameAr/slug/brand).
   **Expected**: product created, listing attached, row leaves the pending queue.
3. Reject another item. **Expected**: row marked rejected, no product created.

## Scenario 5 — Catalog curation (AC3)

1. In `/ar/admin/catalog`, search a product; open it; edit names/description/images; save.
   **Expected**: changes visible on the public product page.
2. Merge a duplicate into its survivor. **Expected**: survivor now carries both products'
   offers, history, variants, favorites, and alerts (no duplicates); source product gone
   (its old URL 404s).
3. Delete a junk product. **Expected**: product and all its dependents gone; site renders
   without errors.
