# Tasks: Admin Operations

**Input**: Design documents from `/specs/006-admin-operations/`

**Status**: Baseline — tasks below reflect functionality already implemented and verified
against the running codebase on 2026-07-22; they are checked `[x]` for that reason.

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: No automated test suite (`BACKLOG.md`); verification is quickstart.md.

**Organization**: Single P2 user story (spec.md has one story).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 `User.isAdmin` flag + `MatchReview`/`AppSetting` models in `web/prisma/schema.prisma` (shared with 004/005)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 `getAdminUser`/`requireAdmin` gate in `web/src/lib/auth/admin.ts`
- [x] T003 [P] Admin-promotion script in `web/scripts/make-admin.ts`
- [x] T004 [P] `AUTO_APPROVE_KEY` get/set helpers in `web/src/lib/settings.ts`

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Operate and curate the catalog (Priority: P2)

**Goal**: Owner controls scraping, resolves the review queue, and fixes catalog quality —
all inaccessible to non-admins.

**Independent Test**: quickstart.md Scenarios 1–5.

### Scraper control plane

- [x] T005 [US1] Scraper admin page (store config, jobs/runs overview via `getScraperOverview`, auto-approve toggle) in `web/src/app/[locale]/admin/scraper/page.tsx`
- [x] T006 [US1] Save/Run-now actions with redirect-after-POST (`?saved=1`/`?queued=1`) and clamped config in `web/src/app/[locale]/admin/scraper/actions.ts` (depends on T002, T004)
- [x] T007 [P] [US1] Run-detail per-URL audit view (outcome filters, data-quality badges) in `web/src/app/[locale]/admin/scraper/runs/[id]/`

### Match review queue

- [x] T008 [P] [US1] `approveReview` (create product + attach) / `rejectReview` in `web/src/lib/admin/review.ts`
- [x] T009 [US1] Review page + gated approve/reject actions in `web/src/app/[locale]/admin/review/page.tsx` and `actions.ts` (depends on T008)

### Catalog curation

- [x] T010 [P] [US1] `listProductsForAdmin`/`updateProduct`/`updateProductFull` (brand upsert, JSON-validated specs, URL-filtered images) in `web/src/lib/admin/catalog.ts`
- [x] T011 [US1] Transactional `mergeProducts` (variants+offers+history ride along; alerts/favorites re-point with dedupe; image backfill) in `web/src/lib/admin/catalog.ts`
- [x] T012 [US1] Transactional cascade `deleteProduct` in `web/src/lib/admin/catalog.ts`
- [x] T013 [US1] Catalog admin pages (search/list, full edit form, merge, delete) in `web/src/app/[locale]/admin/catalog/page.tsx`, `actions.ts`, and `catalog/[id]/` (depends on T010–T012)

**Checkpoint**: Story functional and independently testable; all 8 admin page/action files
individually gated.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T014 Run quickstart.md Scenarios 1–5 to confirm baseline behavior

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T004) → Story (T005–T013) → Polish (T014)

## Implementation Strategy

Already delivered. Future work adds new phases below rather than editing the above.
