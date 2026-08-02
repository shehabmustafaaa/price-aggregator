# Tasks: Automated Tests for Ingest & Matching

**Input**: Design documents from `/specs/011-ingest-tests/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature *is* the tests. The "test tasks" below are the deliverable, not
optional add-ons.

**Organization**: US1 = runner + green baseline over the pure logic (P1); US2 = the tricky
known cases encoded as named tests (P2). In practice the US2 cases live inside the same test
files created for US1, so the split is about *which assertions*, not separate files.

## Phase 1: Setup

- [X] T001 Add `vitest` as a devDependency and `"test": "vitest run"` + `"test:watch": "vitest"` scripts to `web/package.json`; run `npm install`
- [X] T002 Create `web/vitest.config.ts`: `test.environment = "node"`, `resolve.alias` mapping `@` → `<web>/src` (so tests can import `@/lib/...`), default `*.test.ts` discovery

**Checkpoint**: `npm test` runs (zero tests) green.

---

## Phase 2: Foundational

- [X] T003 Move the pure `scoreProductPair` from `web/src/lib/admin/duplicates.ts` into `web/src/lib/ingest/similarity.ts` (accept a minimal `{ nameEn, nameAr, brandName }` input; behaviour identical), and update `web/src/lib/admin/duplicates.ts` to import it from `similarity.ts` (re-export if any other caller needs it) — enables DB-free scoring tests (research.md)

**Checkpoint**: `scoreProductPair` importable without pulling in the Prisma client; `tsc` + existing lint still clean.

---

## Phase 3: User Story 1 - Catch matching/ingest regressions (Priority: P1) 🎯 MVP

**Goal**: A single command runs a fast, deterministic, DB-free suite over the pure ingest/
matching logic, with a positive + guarded-negative per behaviour (FR-005).

**Independent Test**: quickstart.md Scenarios 1, 2, 4, 5.

- [X] T004 [P] [US1] `web/src/lib/ingest/sanity.test.ts` — `isPriceSane`: within ±60% accepted, first sighting (`existing=null`) accepted; jump >60% rejected, `newPrice ≤ 0` rejected
- [X] T005 [P] [US1] `web/src/lib/ingest/classify.test.ts` — `isAccessory`: standalone accessory title rejected; phone and phone-bundled-with-free-accessory kept
- [X] T006 [P] [US1] `web/src/lib/catalog/colors.test.ts` — `canonicalColor` AR+EN aliases → one key (e.g. "اسود"/"Ink Black" → `black`), unknown → passthrough; `colorLabel` returns locale label / falls back to key
- [X] T007 [P] [US1] `web/src/lib/text.test.ts` — `normalizeText`: alef/hamza/taa-marbuta/alef-maqsura/tatweel/diacritic folding equal; different words not equal. `searchTokens`: splits + drops length-1 tokens
- [X] T008 [P] [US1] `web/src/lib/ingest/variant.test.ts` — `variantConfig` reads `storage_gb`/`ram_gb` from attrs; `detectNetwork` finds 5G / 4G / LTE and returns null when absent
- [X] T009 [P] [US1] `web/src/lib/ingest/similarity.test.ts` — primitives: `tokenize`, `overlapScore` (shared vs disjoint), `hasAllModelTokens` (⊆ passes / differing digit token fails), `qualifiersMatch` (equal sets pass / "16" vs "16 Pro" fails), `sameBrand` (case/space-insensitive)

**Checkpoint**: `npm test` green over all pure guards; breaking any one guard turns it red.

---

## Phase 4: User Story 2 - Encode the tricky known behaviours (Priority: P2)

**Goal**: The carefully-tuned edge cases exist as named, self-checking assertions.

**Independent Test**: quickstart.md Scenario 3.

- [X] T010 [US2] Add named duplicate-scoring cases to `web/src/lib/ingest/similarity.test.ts`: `scoreProductPair` scores a genuine dup high incl. "5G"/storage noise ("Galaxy A56 5G 256GB" vs "Galaxy A56"); scores 0 for a different model (A56 vs A17) and a different qualifier (iPhone 16 vs 16 Pro); brand disagreement handled (extends T009's file)
- [X] T011 [US2] Ensure the Arabic-variant, digit-token, qualifier, accessory-vs-bundle, and colour-alias cases from the code comments are each represented as a named `it(...)` across the T004–T009 files (add any missing) — the "documented tricky behaviour" set from US2/AC1–AC3

**Checkpoint**: Reading the test names documents the matcher's tuning; each tricky case is guarded.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T012 Run `npm test` (all green) and `rm -rf .next && npm run build` (succeeds, no test tooling in output) to confirm SC-001/SC-004; fix anything found
- [X] T013 Document the test command in `CLAUDE.md` (Commands section) — `cd web && npm test` (+ `npm run test:watch`) — per FR-006
- [X] T014 Update `BACKLOG.md`: mark automated ingest/matching tests done; note DB-integration tests (`matchOffer`/`resolveVariant`/`pipeline`) remain as a follow-on

---

## Dependencies & Execution Order

- Setup T001–T002 → Foundational T003 → US1 T004–T009 → US2 T010–T011 → Polish
- T009 must exist before T010 (both edit `similarity.test.ts`); T010 depends on T003 (scoreProductPair in similarity)
- T004–T009 are independent files → fully parallel

## Parallel Example

```text
After T002 + T003: launch T004, T005, T006, T007, T008, T009 together — six independent
*.test.ts files, no shared state.
```

## Implementation Strategy

MVP = Phases 1–3 (T001–T009): runner + a green, DB-free baseline over every pure guard is the
regression safety net. US2 (T010–T011) enriches the same files with the named tricky cases.
Dev-only; the production build is untouched.
