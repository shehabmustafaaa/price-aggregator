# Implementation Plan: Duplicate-Product Detection & Merge Suggestions

**Branch**: `009-duplicate-detection`

**Date**: 2026-08-02

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-duplicate-detection/spec.md`

## Summary

An admin-only English page at `/admin/catalog/duplicates` that computes likely-duplicate
product pairs **within each category** by scoring products against each other with the ingest
matcher's existing similarity primitives, ranks them, and lets the owner **merge** a pair in
one click (via the existing `mergeProducts`) or **dismiss** it as "not a duplicate" (persisted
in a new `DuplicateDismissal` table keyed on the unordered id pair). To reuse the matcher's
token/brand/qualifier logic without duplicating it, the pure scoring helpers are extracted
from `lib/ingest/match.ts` into a shared `lib/ingest/similarity.ts` that both `match.ts` and
the new `lib/admin/duplicates.ts` import (no behavior change to ingest).

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router, React 19.2.4.

**Primary Dependencies**: Prisma 7 (new `duplicate_dismissals` table + migration); reuses
`mergeProducts` (`lib/admin/catalog.ts`), the extracted matcher helpers, and the admin gate.

**Storage**: PostgreSQL — reads `products`/`brands`/`product_variants`/`offers` (counts);
writes only the new `duplicate_dismissals`; merges go through the existing transactional
`mergeProducts`.

**Testing**: Manual via quickstart.md (project norm).

**Target Platform**: Same `web/` service; admin locale route.

**Project Type**: Web application, single `web/` service.

**Performance Goals**: Bounded compute — pairwise comparison confined to same
(category, brand) groups, with a per-group candidate cap and a global top-N result. O(k²) per
brand-group where k is small, not O(n²) over the whole catalog.

**Constraints**: Comparison is per-category AND brand-agreeing (FR-002/SC-005 — never
cross-category); score threshold near the matcher's existing `CONFIDENCE_THRESHOLD` (0.6);
dismissals keyed on the unordered pair `(min(id),max(id))` (FR-006); page/action thin, logic
in `lib/` (constitution I); English-only (FR-009); read-only except merge + dismiss (FR-010).

**Scale/Scope**: 1 migration + 1 shared-helper extraction + `lib/admin/duplicates.ts` + one
page + one actions file. Reuses merge and gate.

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | Scoring/candidate/dismiss logic in `lib/admin/duplicates.ts` + shared `lib/ingest/similarity.ts`; merge stays in `lib/admin/catalog.ts`; page/actions are thin gated callers. |
| II. Bilingual by construction | N/A (justified) | Admin surfaces are English-only by convention (FR-009); product data shown carries both `nameEn`/`nameAr`. |
| III. Data trust | N/A | No price/offer values are altered; offer/variant counts are display only. |
| IV. Ingest is a pipeline of stages | PASS | Extracting the pure helpers to `similarity.ts` and importing them back into `match.ts` is a behavior-preserving refactor — the pipeline stages and matcher logic are unchanged. |
| V. Scraping | N/A | No scrape triggered (FR-010). |
| VI. Category-extensible, env-only | PASS | New `duplicate_dismissals` via Prisma migration; comparison keys on `categoryId`/`brandId` generically. |
| VII. Simplicity first | PASS | Reuses `mergeProducts` + matcher primitives; brand-group bounding avoids a full O(n²) scan and any search/index infra. |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/009-duplicate-detection/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── page-and-actions.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
web/
├── prisma/
│   ├── schema.prisma                     # EDIT: add DuplicateDismissal model
│   └── migrations/                       # NEW: migration for duplicate_dismissals
└── src/
    ├── lib/ingest/
    │   ├── similarity.ts                 # NEW: extracted pure helpers (tokenize, overlapScore,
    │   │                                 #      hasAllModelTokens, qualifiersMatch, sameBrand, normalizeArabic)
    │   └── match.ts                      # EDIT: import the above instead of local copies (no behavior change)
    ├── lib/admin/
    │   ├── duplicates.ts                 # NEW: findDuplicateCandidates(limit), scoreProductPair, dismissDuplicatePair
    │   └── catalog.ts                    # existing mergeProducts — reused as-is
    └── app/[locale]/admin/catalog/duplicates/
        ├── page.tsx                      # NEW: AdminGate + ranked pair list + empty state (English-only)
        └── actions.ts                    # NEW: mergeAction (-> mergeProducts), dismissAction (-> dismissDuplicatePair)
```

**Structure Decision**: Place the page under `admin/catalog/duplicates` (it's a catalog-
curation tool, sibling to the merge it feeds). Extract matcher helpers to `lib/ingest/
similarity.ts` so detection and ingest share one implementation.

## Complexity Tracking

> Not applicable — no violations.
