# Tasks: Deals & Price History

**Input**: Design documents from `/specs/003-deals-and-history/`

**Status**: Baseline — every task below reflects functionality already implemented and
verified against the running codebase on 2026-07-22. All tasks are checked `[x]` for that
reason.

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: No automated test suite exists yet (`BACKLOG.md`); verification is the manual
quickstart.md walkthrough.

**Organization**: Single P2 user story in this domain (spec.md has one story).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 `price_history` table + `PriceHistory` model in `web/prisma/schema.prisma` (shared with [[001-catalog-comparison]])

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 `MAX_PLAUSIBLE_SPREAD = 0.45` named constant in `web/src/lib/catalog/deals.ts`
- [x] T003 [P] `getPriceHistory(productId, days)` raw history read in `web/src/lib/catalog/offers.ts`

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Discover deals and price history (Priority: P2)

**Goal**: A shopper sees plausibility-capped cross-store deals, recent price drops, and a
90-day price-history chart per product.

**Independent Test**: Open the deals page; verify every entry's spread is <45% and computed
from fresh offers only (quickstart.md Scenarios 1–3).

### Implementation for User Story 1

- [x] T004 [US1] `getBestDeals()` — cross-store spread per product+storage, 45%-capped, deduped to best-spread-per-product — in `web/src/lib/catalog/deals.ts` (depends on T002)
- [x] T005 [P] [US1] `getPriceDrops()` — offers below their own 30-day high — in `web/src/lib/catalog/deals.ts` (depends on T002)
- [x] T006 [US1] Deals page rendering ranked deals + price drops in `web/src/app/[locale]/deals/page.tsx` (depends on T004, T005)
- [x] T007 [P] [US1] Homepage featured-deals strip in `web/src/app/[locale]/page.tsx` (depends on T004)
- [x] T008 [US1] Product page 90-day daily-lowest price-history chart in `web/src/app/[locale]/p/[slug]/page.tsx` (depends on T003)

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T009 Run quickstart.md Scenarios 1–4 against the live/local site to confirm baseline behavior

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T003) → User Story 1 (T004–T008) → Polish (T009)

## Implementation Strategy

Already delivered as a single MVP increment. Future work in this domain should add a new
phase here rather than editing the tasks above.
