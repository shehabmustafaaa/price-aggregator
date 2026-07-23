# Tasks: Search & Browse

**Input**: Design documents from `/specs/002-search-and-browse/`

**Status**: Baseline — every task below reflects functionality already implemented and
verified against the running codebase on 2026-07-22. All tasks are checked `[x]` for that
reason; this file exists so future changes to this domain have a task list to extend, and so
`/speckit-converge` has something to check the code against.

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated test suite exists yet (`BACKLOG.md`); verification is the manual
quickstart.md walkthrough.

**Organization**: Single P1 user story in this domain (spec.md has one story).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Shared Arabic-aware text normalization (`normalizeText`, `searchTokens`) in `web/src/lib/text.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 Define `Category`/`SpecDefinition`/`Brand`/`MissedSearch` models in `web/prisma/schema.prisma`
- [x] T003 [P] `getCategoryBySlug`/`listCategories`/`listBrandsInCategory` in `web/src/lib/catalog/products.ts` (depends on T002)

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Find products by search and browse (Priority: P1) 🎯 MVP

**Goal**: A shopper finds products via Arabic/English tolerant-spelling search, or by browsing
a category with pagination and brand/price/spec filters.

**Independent Test**: Search with an alternate Arabic spelling and confirm the product is
found; apply a brand filter on a category page and confirm only that brand remains
(quickstart.md Scenarios 1–3).

### Implementation for User Story 1

- [x] T004 [US1] `searchProducts()` — token match over name/brand/model + all offer titles (fresh & stale), zero-result `MissedSearch` logging — in `web/src/lib/catalog/search.ts` (depends on T001, T003)
- [x] T005 [US1] Search results page in `web/src/app/[locale]/search/page.tsx` (depends on T004)
- [x] T006 [P] [US1] `listCategoryProducts()` — brand/price/RAM/storage filters, pagination, sort — in `web/src/lib/catalog/products.ts` (depends on T003)
- [x] T007 [P] [US1] `getSpecFacets()` — plausibility-bounded RAM/storage facet chips — in `web/src/lib/catalog/products.ts` (depends on T002)
- [x] T008 [US1] Category browse page (filters + pagination UI) in `web/src/app/[locale]/c/[slug]/page.tsx` (depends on T006, T007)
- [x] T009 [P] [US1] Home-page pagination via `listLatestProducts()` in `web/src/lib/catalog/products.ts` and `web/src/app/[locale]/page.tsx`

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T010 Run quickstart.md Scenarios 1–4 against the live/local site to confirm baseline behavior

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T003) → User Story 1 (T004–T009) → Polish (T010)

## Implementation Strategy

Already delivered as a single MVP increment. Future work in this domain should add a new
phase here rather than editing the tasks above.
