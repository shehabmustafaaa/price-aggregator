# Tasks: Catalog & Price Comparison

**Input**: Design documents from `/specs/001-catalog-comparison/`

**Status**: Baseline — every task below reflects functionality already implemented and
verified against the running codebase on 2026-07-22 (see plan.md/research.md/data-model.md
for the evidence trail). All tasks are checked `[x]` for that reason; this file exists so
future *changes* to this domain have a task list to extend, and so `/speckit-converge` has
something to check the code against.

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated test suite exists yet (`BACKLOG.md`); verification is the manual
quickstart.md walkthrough, not automated test tasks.

**Organization**: Single P1 user story in this domain (spec.md has one story).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 PostgreSQL schema + Prisma 7 driver-adapter client configured (`web/prisma/schema.prisma`, `web/src/lib/db.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema and shared helpers every catalog read depends on.

- [x] T002 Define `Product`/`ProductVariant`/`Offer`/`OutboundClick`/`Store`/`Brand` models in `web/prisma/schema.prisma`
- [x] T003 Implement `freshOfferWhere()` — the single 24h staleness gate — in `web/src/lib/catalog/offers.ts`
- [x] T004 [P] Implement canonical color map + `colorLabel()` render lookup in `web/src/lib/catalog/colors.ts`

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Compare prices for a phone (Priority: P1) 🎯 MVP

**Goal**: A shopper can see, per product, every covered store's price per storage variant and
color, ranked, with warranty type and stock status, and follow a tracked link to the store.

**Independent Test**: Open a product page with offers from ≥2 stores; verify grouped/ranked
offers with store, price, warranty, stock, and a working "Go to store" link (quickstart.md
Scenario 1).

### Implementation for User Story 1

- [x] T005 [P] [US1] `getVisibleOffersForProduct`/`getProductBySlug` (fresh-offer-gated reads) in `web/src/lib/catalog/offers.ts`, `web/src/lib/catalog/products.ts`
- [x] T006 [P] [US1] `bestPrice()` derived-price helper (fresh offers only) in `web/src/lib/catalog/products.ts`
- [x] T007 [US1] Product/comparison page rendering grouped-by-variant, ranked, per-color best price + galleries in `web/src/app/[locale]/p/[slug]/page.tsx` (depends on T005, T006)
- [x] T008 [US1] Product page renders name/images/specs with zero fresh offers, no price claim (same file as T007)
- [x] T009 [P] [US1] `recordOutboundClick()` in `web/src/lib/tracking/clicks.ts`
- [x] T010 [US1] `/go/[offerId]` redirect (freshness-gate-exempt lookup + click record + 302) in `web/src/app/go/[offerId]/route.ts` (depends on T009)
- [x] T011 [P] [US1] `getOfferForRedirect()` — deliberately unfiltered lookup for T010 — in `web/src/lib/catalog/offers.ts`
- [x] T012 [P] [US1] Public "report wrong price" endpoint in `web/src/app/api/report-price/route.ts` + `reportWrongPrice()` in `web/src/lib/tracking/clicks.ts`
- [x] T013 [P] [US1] Site-wide dark theme + installable PWA manifest in `web/src/app/manifest.ts`
- [x] T014 [US1] Static About page

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T015 Run quickstart.md Scenarios 1–6 against the live/local site to confirm baseline behavior

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T004) → User Story 1 (T005–T014) → Polish (T015)
- T005/T006 depend on T002–T004; T007/T008 depend on T005/T006; T010 depends on T009 and T011

## Implementation Strategy

Already delivered as a single MVP increment (no phased rollout was needed — this is the
baseline). Future work in this domain should add a new phase here rather than editing the
tasks above.
