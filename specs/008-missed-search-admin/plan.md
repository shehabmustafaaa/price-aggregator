# Implementation Plan: Missed-Search Admin View

**Branch**: `008-missed-search-admin`

**Date**: 2026-07-23

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-missed-search-admin/spec.md`

## Summary

An admin-only, English-only page at `/admin/missed-searches` that reads the already-logged
`MissedSearch` rows, aggregates them by normalized term (same `normalizeText` the search
uses), and shows each distinct term once with its count, the locale(s) searched, and the most
recent timestamp — ordered by count descending, capped at a top-N. A single write action,
"dismiss", deletes all rows whose normalized term matches, removing the row. Reuses the exact
admin pattern of `/admin/review` (`getAdminUser` + `AdminGate`, `force-dynamic`, server
action + `revalidatePath`). No catalog/scraper writes.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router, React 19.2.4.

**Primary Dependencies**: Prisma 7 (`missed_searches` table), the shared
`normalizeText` in `web/src/lib/text.ts`, existing admin auth (`lib/auth/admin.ts`).

**Storage**: PostgreSQL — reads and deletes `missed_searches`; no schema change.

**Testing**: Manual via quickstart.md (project norm, no automated suite).

**Target Platform**: Same `web/` service; admin locale route.

**Project Type**: Web application, single `web/` service.

**Performance Goals**: None specific; aggregation is over the missed-search table (small),
done in one grouped query capped at top-N (e.g. 100).

**Constraints**: Aggregation grouping must use the site's `normalizeText` (FR-004) so
`missed_searches.query` values that differ only by case/whitespace/alef-form collapse to one
row — note the stored `query` is the raw text (search.ts stores `query.trim()`, not the
normalized form), so normalization happens at read/aggregate time, in `lib/`. Page/action
thin (constitution I). English-only admin surface (FR-008). Read-only except dismiss delete
(FR-007).

**Scale/Scope**: 1 new page + 1 server action + 1 `lib/admin/missed-searches.ts` module + one
sidebar/nav link. No new entity.

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | Aggregation + dismiss in `web/src/lib/admin/missedSearches.ts`; page and action are thin callers (mirrors `lib/admin/review.ts`). |
| II. Bilingual by construction | N/A (justified) | Admin surfaces are English-only by established convention (`/admin/scraper`, `/admin/review`), which FR-008 codifies; the *data* rows still show their `locale`. |
| III. Data trust | N/A | No price/offer data. |
| IV. Ingest pipeline | N/A | Untouched — reads the log the pipeline's search side already writes. |
| V. Scraping | N/A | FR-007: no scrape triggered. |
| VI. Env-only config | PASS | No host specifics. |
| VII. Simplicity first | PASS | Reuses `normalizeText`, existing admin gate, and a single grouped query + delete — no new model, no new dependency. |

No violations. (II is the standing admin-English-only exception already accepted across the
admin area, not a new deviation.)

## Project Structure

### Documentation (this feature)

```text
specs/008-missed-search-admin/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── page-and-action.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
web/src/
├── lib/
│   ├── text.ts                          # existing normalizeText — reused for grouping
│   └── admin/missedSearches.ts          # NEW: aggregateMissedSearches(limit), dismissMissedSearch(term)
├── app/[locale]/admin/
│   └── missed-searches/
│       ├── page.tsx                     # NEW: AdminGate + ranked table + empty state (English-only)
│       └── actions.ts                   # NEW: dismissAction → dismissMissedSearch + revalidatePath
```

**Structure Decision**: Clone the `/admin/review` structure exactly (page + actions +
`lib/admin/*` module) — it is the established admin-tool shape. There is no shared admin
nav/layout today (admin pages are reached by direct URL), so no nav-link edit is in scope;
the page is reachable at `/admin/missed-searches` like the other admin tools.

## Complexity Tracking

> Not applicable — no violations.
