# Implementation Plan: Admin Operations

**Branch**: `006-admin-operations`

**Date**: 2026-07-22

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-admin-operations/spec.md`

**Note**: This is a BASELINE plan — it documents a domain that is already built and live at
https://shehabw1.space. Phase 0/1 artifacts record *existing* decisions verified against the
current codebase, not proposed ones.

## Summary

The admin area is three route groups under `web/src/app/[locale]/admin/` — `scraper/`
(control plane + run audit), `review/` (match-review queue), `catalog/` (search, edit, merge,
delete) — every page and every server action independently gated by
`requireAdmin()`/`getAdminUser()` (`web/src/lib/auth/admin.ts`), which checks the `isAdmin`
flag on the ordinary session account from [[004-accounts-alerts]]. Business logic lives in
`web/src/lib/admin/{catalog,review}.ts`, `web/src/lib/scraper/jobs.ts`, and
`web/src/lib/settings.ts`; actions use redirect-after-POST (`?saved=1`) to avoid
resubmission prompts. Admins are promoted via `web/scripts/make-admin.ts`.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router (server actions), React
19.2.4.

**Primary Dependencies**: Prisma 7; session auth from [[004-accounts-alerts]] (jose JWT);
no separate admin auth system.

**Storage**: PostgreSQL — reads/writes `stores` (scrape config), `scrape_jobs`,
`scrape_runs`, `ingest_events` (run detail), `match_review_queue`, `products` (+cascade
targets on delete/merge), `app_settings` (`ingest.auto_approve`).

**Testing**: None automated (`BACKLOG.md`); verification via quickstart.md (log in as
admin, exercise each surface; confirm non-admin is rejected).

**Target Platform**: Same server-rendered `web/` app; admin routes are locale-prefixed like
everything else.

**Project Type**: Web application, single `web/` service.

**Performance Goals**: N/A — solo-operator surface.

**Constraints**: Every admin page AND server action calls `requireAdmin`/`getAdminUser`
itself (defense in depth — no reliance on hidden navigation); merge/delete run inside
`prisma.$transaction`; scraper-config saves clamp interval ≥15 min and delay ≥1 s.

**Scale/Scope**: One admin (the owner); no roles/tiers.

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | `mergeProducts`/`deleteProduct`/`updateProductFull` in `lib/admin/catalog.ts`; `approveReview`/`rejectReview` in `lib/admin/review.ts`; control-plane ops in `lib/scraper/jobs.ts`; settings in `lib/settings.ts`. Pages/actions are thin gate-then-call wrappers. |
| II. Bilingual by construction | PASS | Product edit forms carry `nameEn`/`nameAr`/`descriptionEn`/`descriptionAr`; review approval collects both names before creating a product. |
| III. Data trust non-negotiable | PASS | The run-detail audit surfaces [[005-scraping-ingest]]'s per-URL outcomes; auto-approve toggle governs auto-creation; merge/delete are transactional so the catalog is never left half-consolidated. |
| IV/V. Ingest / scraping | N/A here | This domain operates the controls; the mechanisms are [[005-scraping-ingest]]'s. |
| VI. Category-extensible, env-only | PASS | No host specifics; review approval takes a `categorySlug` rather than hardcoding phones (defaults to `mobile-phones` as the only category today). |
| VII. Simplicity first | PASS | Plain server actions + redirect-after-POST; no admin framework or separate SPA. |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-admin-operations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/           # none — admin is session-gated server actions, no public API
└── tasks.md
```

### Source Code (repository root)

```text
web/src/
├── lib/
│   ├── auth/admin.ts          # getAdminUser / requireAdmin (isAdmin gate)
│   ├── admin/
│   │   ├── catalog.ts         # listProductsForAdmin, updateProduct(Full), deleteProduct (cascade tx), mergeProducts (tx)
│   │   └── review.ts          # approveReview / rejectReview
│   ├── scraper/jobs.ts        # getScraperOverview, requestRun, updateStoreScrapeConfig (shared with 005)
│   └── settings.ts            # AUTO_APPROVE_KEY get/set (AppSetting)
├── app/[locale]/admin/
│   ├── scraper/page.tsx + actions.ts     # store config, jobs/runs, Run-now, auto-approve toggle; redirect ?saved=1/?queued=1
│   ├── scraper/runs/[id]/                # run detail: per-URL IngestEvent audit with outcome filters
│   ├── review/page.tsx + actions.ts      # approve (create product + attach) / reject queue items
│   └── catalog/page.tsx + actions.ts     # product search/list; [id]/ full edit form, merge, delete
└── scripts/make-admin.ts      # one-off: flag an account as admin
```

**Structure Decision**: Existing layout; admin UI is ordinary locale routes gated per-page
and per-action, per constitution I.

## Complexity Tracking

> Not applicable — no violations.
