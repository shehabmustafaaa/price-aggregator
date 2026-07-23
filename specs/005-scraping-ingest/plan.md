# Implementation Plan: Automated Scraping & Ingest Pipeline

**Branch**: `005-scraping-ingest`

**Date**: 2026-07-22

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-scraping-ingest/spec.md`

**Note**: This is a BASELINE plan — it documents a domain that is already built and live at
https://shehabw1.space. Phase 0/1 artifacts record *existing* decisions verified against the
current codebase, not proposed ones.

## Summary

Two cooperating halves. **Scraper** (`scraper/`, Python 3.12): a daemon polls
`/api/scraper/claim`, runs the claimed store's adapter (`scrape() -> list[ScrapeResult]`),
POSTs results to `/api/ingest`, and reports via `/api/scraper/complete` — all authenticated
by the shared `x-ingest-secret` header, never touching the DB. **Web control plane + ingest**
(`web/src/lib/scraper/jobs.ts`, `web/src/lib/ingest/`): `claimNextJob` self-heals stale
RUNNING jobs (30 min), serves manual PENDING jobs first, then per-store schedules keyed on
the **last attempt of any status** so failing stores back off. `ingest()` runs the fixed
pipeline — accessory filter → color canonicalization → ±60% price sanity → match (existing
offer → model number → guarded token overlap) → auto-create or review-queue → storage-keyed
variant resolve → offer upsert + price history → post-ingest hooks — writing a permanent
`ScrapeRun` health row and per-URL `IngestEvent` audit rows pruned after 2 days.

## Technical Context

**Language/Version**: Python 3.12+ (scraper: httpx, parsel, python-dotenv; Playwright
optional for B.TECH); TypeScript 5 / Next.js 16.2.10 (web side).

**Primary Dependencies**: Scraper→web is plain HTTP with zod validation
(`web/src/lib/ingest/schema.ts` is the payload contract). Prisma 7 for all DB writes (web
side only).

**Storage**: PostgreSQL — writes `scrape_jobs`, `scrape_runs`, `ingest_events` (2-day
retention), `offers`, `price_history`, `product_variants`, `products` (auto-create),
`match_review_queue`; reads `stores` config and `app_settings` (`ingest.auto_approve`).

**Testing**: None automated (`BACKLOG.md`). Verify end-to-end with `main.py mock` and the
`/admin/scraper` run detail per-URL audit ([[006-admin-operations]]).

**Target Platform**: Prod scraper = systemd `asaar-scraper` on the aaPanel Linux host (ONE
instance only; NO pm2); B.TECH's Chromium launches `--no-sandbox` for root. Web side runs in
the aaPanel Node Project.

**Project Type**: Web app + decoupled worker communicating over HTTP only.

**Performance Goals**: SC-001 — each enabled store scraped at its interval (default ~3h,
enforced minimum 15 min) unattended for a week+.

**Constraints**: Per-store `requestDelaySeconds` (min 1s) honored by adapters; scheduling
keyed on last attempt of ANY status (back-off, constitution V); stale RUNNING jobs auto-fail
after 30 min; one broken store never blocks others (per-offer try/catch + per-store jobs);
`INGEST_SECRET` must match between `web/.env` and `scraper/.env`.

**Scale/Scope**: Adapters: dream2000 (Shopify products.json), btech (Playwright), 2b
(Magento HTML, disabled in prod — datacenter IP block), mock (pipeline testing). New store =
new adapter file registered in `main.py build_adapter`.

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | `claimNextJob`/`completeJob`/`requestRun` in `lib/scraper/jobs.ts`; the whole pipeline in `lib/ingest/pipeline.ts` + stage modules; the three API routes are thin secret-check→call→respond wrappers. |
| II. Bilingual by construction | PASS | Auto-created products get `nameEn`/`nameAr` (`autocreate.ts`); color canonicalization handles Arabic aliases; matching normalizes Arabic orthography (`match.ts`, `lib/text.ts`). |
| III. Data trust non-negotiable | PASS | `isPriceSane` ±60% rejection recorded as `REJECTED_PRICE`; every run writes a `ScrapeRun`; every URL an `IngestEvent`; `lastSeenAt` refresh is what feeds [[001-catalog-comparison]]'s freshness gate. |
| IV. Ingest is a pipeline of stages | PASS | `ingest()` is the fixed stage sequence; alerts integrate via `registerPostIngestHook` (side-effect import), not pipeline edits; adapters implement one interface; per-offer try/catch → `ERROR` audit rows keep one bad listing from killing a run. |
| V. Scrape politely, survive blocks | PASS | `requestDelaySeconds` passed to adapters via the claim response; due-check keyed on last attempt of any status (jobs.ts comment documents the flood fix); stale-job self-heal; 2B disabled rather than fought. |
| VI. Category-extensible, env-only | PASS | Payload carries `category_slug`; accessory filter applies only to `mobile-phones`; secrets/URLs from `.env` on both sides. |
| VII. Simplicity first | PASS | Polling daemon + jobs table instead of a queue service (no Redis/BullMQ); Shopify JSON preferred over HTML where available. |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-scraping-ingest/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── scraper-web-http.md   # the three-endpoint HTTP contract + payload schema
└── tasks.md
```

### Source Code (repository root)

```text
web/src/
├── lib/scraper/jobs.ts        # claimNextJob (self-heal, manual-first, schedule back-off), completeJob, requestRun, updateStoreScrapeConfig
├── lib/ingest/
│   ├── schema.ts              # zod payload contract (rawOfferSchema / ingestPayloadSchema)
│   ├── pipeline.ts            # ingest(): the fixed stage sequence + run/audit writes
│   ├── classify.ts            # isAccessory title filter
│   ├── sanity.ts              # isPriceSane ±60%
│   ├── match.ts               # model-number-first, guarded bilingual token overlap
│   ├── autocreate.ts          # unmatched → new product (when auto-approve on)
│   ├── variant.ts             # resolveVariant / variantConfig (storage-keyed)
│   └── hooks.ts               # registerPostIngestHook / runPostIngestHooks
└── app/api/
    ├── ingest/route.ts            # POST, x-ingest-secret
    ├── scraper/claim/route.ts     # POST, daemon poll
    └── scraper/complete/route.ts  # POST, job outcome

scraper/
├── main.py                    # CLI (mock | <store> | daemon --poll N), build_adapter registry
├── core/                      # ingest_client (HTTP POST helpers)
└── adapters/                  # dream2000.py, btech.py, twob.py, mock_store.py
```

**Structure Decision**: Existing two-service layout; HTTP-only coupling via the contract in
`contracts/scraper-web-http.md`, per constitution Technology Constraints.

## Complexity Tracking

> Not applicable — no violations.
