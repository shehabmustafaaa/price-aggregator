# Quickstart: Automated Scraping & Ingest Pipeline

**Status**: Baseline validation guide. No automated test suite exists yet (`BACKLOG.md`).

## Prerequisites

- `web` running locally with migrated/seeded DB; `INGEST_SECRET` identical in `web/.env`
  and `scraper/.env`.
- Scraper venv: `cd scraper && python -m venv .venv && .venv/Scripts/pip install -r
  requirements.txt` (add `requirements-browser.txt` only for B.TECH).

## Scenario 1 — End-to-end mock pipeline (AC2, AC5)

1. `cd scraper && .venv/Scripts/python main.py mock`
2. **Expected**: exit success; a new `scrape_runs` row (SUCCESS/PARTIAL) and one
   `ingest_events` row per mock URL; offers attached to storage variants with canonical
   color keys; auto-created products where nothing matched (auto-approve default on).

## Scenario 2 — Price-sanity rejection (AC3)

1. `.venv/Scripts/python main.py mock --price-shift -5000` (or any shift beyond ±60% of the
   previously ingested mock prices — run Scenario 1 first).
2. **Expected**: rejected offers audited as `REJECTED_PRICE` with the old→new price reason,
   counted in the run's `rejects`, and queued in `match_review_queue` for human review.

## Scenario 3 — Accessory filtering (AC4)

1. Include an accessory-titled listing (the mock adapter ships some) and ingest.
2. **Expected**: audited `SKIPPED_ACCESSORY`, never attached to a product.

## Scenario 4 — Scheduling and back-off (AC1)

1. Start ONE daemon: `.venv/Scripts/python main.py daemon --poll 30`.
2. In `/admin/scraper` set a store's interval to 15 min and watch: exactly one scheduled job
   per interval elapse.
3. Break the store (e.g. disable network); **Expected**: the failed attempt still counts —
   no re-claim until a full interval passes (no job flood).

## Scenario 5 — Stale-job self-heal (edge case)

1. Kill the daemon mid-run (job stuck RUNNING).
2. \>30 min later, trigger any claim (poll or Run-now).
3. **Expected**: the stuck job flips to FAILED with a "stale: no completion within 30 min"
   note, and the store becomes claimable again.

## Scenario 6 — Review queue path (AC2, auto-approve off)

1. In `/admin/scraper` turn auto-approve OFF; ingest a listing matching no product.
2. **Expected**: audited `REVIEW_QUEUED` (with best-confidence reason), a pending
   `match_review_queue` row (deduped per URL), and no product created.

## Scenario 7 — Real store (spot check)

1. `.venv/Scripts/python main.py dream2000 --dry-run` (prints instead of POSTing), then
   without `--dry-run`.
2. **Expected**: run health row + per-URL audit visible in `/admin/scraper` run detail
   ([[006-admin-operations]]).
