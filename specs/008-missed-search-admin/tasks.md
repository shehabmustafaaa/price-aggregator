# Tasks: Missed-Search Admin View

**Input**: Design documents from `/specs/008-missed-search-admin/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — manual verification via quickstart.md (project norm).

**Organization**: US1 = ranked aggregated list (P1), US2 = dismiss (P2).

## Phase 1: Setup

_No setup tasks — reuses existing `missed_searches` table, `normalizeText`, and the admin
gate. No new dependencies, no migration._

---

## Phase 2: Foundational

- [ ] T001 Create `web/src/lib/admin/missedSearches.ts` with the `MissedSearchRow` type and `aggregateMissedSearches(limit = 100)`: fetch `missed_searches` rows, group in JS keyed on `normalizeText(query)` (from `web/src/lib/text.ts`), accumulate count + distinct locales + max `createdAt` + a representative raw term, sort by count desc then `lastSearchedAt` desc, slice to `limit` (per data-model.md / research.md)

**Checkpoint**: Aggregation available for the page.

---

## Phase 3: User Story 1 - See what shoppers searched for but couldn't find (Priority: P1) 🎯 MVP

**Goal**: Admin-only ranked list of normalized zero-result terms with count, locale(s), and
last-searched time.

**Independent Test**: quickstart.md Scenarios 1–3, 5.

- [ ] T002 [US1] Create `web/src/app/[locale]/admin/missed-searches/page.tsx`: server component, `export const dynamic = "force-dynamic"`, `if (!(await getAdminUser())) return <AdminGate />` (FR-001/FR-008, English-only), render a table (Term / Count / Locale(s) / Last searched) from `aggregateMissedSearches()` ordered by count desc, with a clear empty state when zero rows (FR-002/FR-003/FR-006) — mirrors `web/src/app/[locale]/admin/review/page.tsx` (depends on T001)

**Checkpoint**: Read-only ranked list works and is gated — usable MVP.

---

## Phase 4: User Story 2 - Dismiss a query once it's been handled (Priority: P2)

**Goal**: Remove a handled term (all its logged occurrences) so it stops appearing.

**Independent Test**: quickstart.md Scenario 4.

- [ ] T003 [US2] Add `dismissMissedSearch(normalizedTerm)` to `web/src/lib/admin/missedSearches.ts`: fetch candidate rows, delete every `missed_searches` row whose `normalizeText(query)` equals `normalizedTerm` (all locales/casings); zero matches is a no-op, never throws (FR-005/FR-007, edge case 4)
- [ ] T004 [US2] Create `web/src/app/[locale]/admin/missed-searches/actions.ts`: `"use server"` `dismissAction(formData)` — `await getAdminUser()` guard, read hidden `normalized` field, call `dismissMissedSearch`, then `revalidatePath` (depends on T003)
- [ ] T005 [US2] Add a per-row dismiss `<form action={dismissAction}>` with a hidden `normalized` input to `web/src/app/[locale]/admin/missed-searches/page.tsx` (depends on T002, T004)

**Checkpoint**: Both stories complete and independently testable.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T006 Run quickstart.md Scenarios 1–6 (aggregation, normalization collapse, gating, dismiss incl. cross-locale, empty state, read-only) in the local admin; fix anything found
- [ ] T007 Update `BACKLOG.md`: mark the missed-search admin view done

---

## Dependencies & Execution Order

- Foundational T001 first (blocks everything)
- US1: T002 after T001
- US2: T003 after T001 (∥ T002); T004 after T003; T005 after T002 + T004
- Polish last

## Parallel Example

```text
After T001: T002 (page) and T003 (dismiss lib fn) can be written in parallel — different
concerns in different files (T003 adds to the lib module, T002 reads from it).
```

## Implementation Strategy

MVP = Phase 2 + Phase 3 (T001–T002): the ranked read-only list alone delivers the feature's
core value. US2 (dismiss, T003–T005) is an independent follow-on increment.
