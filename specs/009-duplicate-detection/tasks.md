# Tasks: Duplicate-Product Detection & Merge Suggestions

**Input**: Design documents from `/specs/009-duplicate-detection/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — manual verification via quickstart.md (project norm).

**Organization**: US1 = ranked candidate list (P1), US2 = merge in place (P1), US3 = dismiss (P2).

## Phase 1: Setup

- [X] T001 Add `DuplicateDismissal` model to `web/prisma/schema.prisma` (`productLoId`, `productHiId`, `createdAt`; `@@unique([productLoId, productHiId])`; `@@map("duplicate_dismissals")`; no FK cascade — advisory row per data-model.md) and run `npx prisma migrate dev --name duplicate_dismissals`

---

## Phase 2: Foundational

- [X] T002 Extract the pure matcher helpers into `web/src/lib/ingest/similarity.ts`: move `tokenize`, `overlapScore`, `hasAllModelTokens`, `qualifiersMatch`, `sameBrand`, `normalizeArabic`, and the `QUALIFIERS` set out of `web/src/lib/ingest/match.ts`, exporting them
- [X] T003 Update `web/src/lib/ingest/match.ts` to import those helpers from `lib/ingest/similarity.ts` (delete the local copies; behavior must be identical — no matcher logic change)

**Checkpoint**: Shared similarity helpers available; ingest matcher unchanged in behavior.

---

## Phase 3: User Story 1 - See likely duplicate products ranked (Priority: P1) 🎯 MVP

**Goal**: Admin-only ranked list of same-category likely-duplicate pairs with enough detail to judge each.

**Independent Test**: quickstart.md Scenarios 1–3, 6.

- [X] T004 [US1] Create `web/src/lib/admin/duplicates.ts` with `DuplicateCandidate` type, `scoreProductPair(a, b)` (symmetric, brand-gated via `lib/ingest/similarity.ts`; digit-token guard both directions + qualifier agreement; best of EN/AR overlap; single named threshold constant ≈ 0.6), and `findDuplicateCandidates(limit = 100)` (group products by `(categoryId, brandId)`, score intra-group pairs incl. null-brand group, keep score ≥ threshold, exclude dismissed pairs from `duplicate_dismissals`, sort desc, top-N; include per-product first image + offer/variant counts) (depends on T001, T002)
- [X] T005 [US1] Create `web/src/app/[locale]/admin/catalog/duplicates/page.tsx`: server component, `export const dynamic = "force-dynamic"`, `if (!(await getAdminUser())) return <AdminGate />` (FR-001/FR-009, English-only), render `findDuplicateCandidates()` as pair cards (both products: bilingual name, brand, image, offer/variant counts, score), most-similar first, with a clear empty state (FR-003/FR-007) (depends on T004)

**Checkpoint**: Read-only ranked duplicate list works and is gated — usable MVP.

---

## Phase 4: User Story 2 - Merge a confirmed duplicate in one click (Priority: P1)

**Goal**: Merge a listed pair (explicit survivor) via the existing merge tool.

**Independent Test**: quickstart.md Scenario 4.

- [X] T006 [US2] Add `mergeAction(formData)` to `web/src/app/[locale]/admin/catalog/duplicates/actions.ts`: `"use server"`, `getAdminUser()` guard, read `survivorId`/`absorbedId`, call `mergeProducts(absorbedId, survivorId)` (existing, `lib/admin/catalog.ts`), swallow a missing-product error (concurrent resolution), `revalidatePath` (FR-004)
- [X] T007 [US2] Add per-pair "Merge → keep A" / "Merge → keep B" buttons (hidden `survivorId`/`absorbedId`) to the pair card in `web/src/app/[locale]/admin/catalog/duplicates/page.tsx`, making the survivor/absorbed direction explicit before confirm (US2/AC3) (depends on T005, T006)

**Checkpoint**: Detect + merge loop complete.

---

## Phase 5: User Story 3 - Dismiss a false positive (Priority: P2)

**Goal**: Persistently suppress a non-duplicate pair.

**Independent Test**: quickstart.md Scenarios 5, 8.

- [X] T008 [US3] Add `dismissDuplicatePair(idA, idB)` to `web/src/lib/admin/duplicates.ts`: canonicalize to `(min,max)`, upsert a `duplicate_dismissals` row; idempotent; never throws (FR-005/FR-006) (depends on T001, T004)
- [X] T009 [US3] Add `dismissAction(formData)` to `web/src/app/[locale]/admin/catalog/duplicates/actions.ts`: guard, read `aId`/`bId`, call `dismissDuplicatePair`, `revalidatePath` (depends on T008)
- [X] T010 [US3] Add a "Not a duplicate" dismiss `<form action={dismissAction}>` (hidden `aId`/`bId`) to the pair card in `web/src/app/[locale]/admin/catalog/duplicates/page.tsx` (depends on T005, T009)

**Checkpoint**: All three stories complete and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T011 Add a link to the duplicates page from `web/src/app/[locale]/admin/catalog/page.tsx` (so it's discoverable from catalog admin)
- [ ] T012 Run quickstart.md Scenarios 1–8 (ranked list, category isolation, gating, merge, dismiss persistence, empty state, read-only, stale dismissal) locally; fix anything found
- [X] T013 Update `BACKLOG.md`: mark duplicate-detection done; note it also addresses part of item #8 (auto-created name dupes)

---

## Dependencies & Execution Order

- Setup T001 → Foundational T002–T003 (T003 after T002) → US1 T004–T005 → US2 T006–T007 → US3 T008–T010 → Polish
- T004 depends on both the migration (T001) and the shared helpers (T002)
- Page (T005) is edited by T007 and T010 too — those are sequential on the same file
- actions.ts is created by T006 and extended by T009 — sequential on the same file

## Parallel Example

```text
After T004+T005 exist: US2 (T006) and US3 lib fn (T008) touch different files and can be
written in parallel; their page/action wiring (T007, T009/T010) then follows.
```

## Implementation Strategy

MVP = Phases 1–3 (T001–T005): the ranked read-only candidate list already tells the owner
where the dupes are. Merge (US2) and dismiss (US3) are the follow-on increments that make it
actionable and self-cleaning. Ships with a Prisma migration, so deploy runs
`prisma migrate deploy` (via `bash deploy.sh`).

---

## Phase 7: Convergence

- [X] T014 Reconcile the scoring description in `plan.md` (Constraints: "digit-token guard both directions") and `research.md` ("Decision: Score products pairwise…" — both-direction guard + `min()`) with the implemented `scoreProductPair` in `web/src/lib/admin/duplicates.ts`, which mirrors the ingest matcher asymmetrically (each product tried as clean "name" vs. the other as "listing", take the max) because the documented `min()` approach scored real dupes with "5G"/storage noise at 0.00, per plan: scoring decision (contradicts, LOW — docs only, code is correct and runtime-verified)

