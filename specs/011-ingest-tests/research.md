# Phase 0 Research: Automated Tests for Ingest & Matching

No `NEEDS CLARIFICATION` markers. Decisions settle the runner, the DB-decoupling, and file
placement.

## Decision: Vitest as the runner

- **Decision**: Add `vitest` (dev dependency) and a `vitest.config.ts` (node environment,
  `@/` alias → `./src`). Run via `npm test` = `vitest run`; `npm run test:watch` = `vitest`.
- **Rationale**: Vitest is TypeScript- and ESM-native, needs no Babel, starts in
  milliseconds, and runs pure functions with zero extra setup — ideal for a fast, deterministic
  unit suite (SC-001). It's dev-only and never referenced by the app, so the Next production
  build is unaffected (FR-004).
- **Alternatives considered**: Jest — heavier TS/ESM setup (ts-jest / babel), slower; `node
  --test` — workable but weaker TS ergonomics and assertions. Both rejected for friction vs.
  Vitest at this stack.

## Decision: Extract `scoreProductPair` into `lib/ingest/similarity.ts` (DB-free)

- **Decision**: Move the pure `scoreProductPair` from `lib/admin/duplicates.ts` into
  `lib/ingest/similarity.ts`, accepting a minimal `{ nameEn, nameAr, brandName }` shape;
  `duplicates.ts` imports it (and may re-export for existing callers). Behaviour unchanged.
- **Rationale**: `duplicates.ts` imports `@/lib/db` (which instantiates the Prisma client at
  module load). Importing it from a unit test would drag the DB client into a pure test,
  violating FR-003's "no database". `scoreProductPair` uses only the similarity primitives, so
  it belongs beside them — and this mirrors the 009 extraction pattern (pure logic in
  `similarity.ts`, DB orchestration in the admin/ingest modules).
- **Alternatives considered**: (a) make `lib/db.ts` lazy so importing it never constructs the
  client — broader change, out of scope. (b) test `scoreProductPair` through `duplicates.ts`
  and tolerate the Prisma import — rejected: couples a pure test to the DB client and risks a
  connection attempt.

## Decision: Colocated `*.test.ts`, node environment, explicit imports from `vitest`

- **Decision**: Test files sit next to their source as `*.test.ts`; each imports
  `{ describe, it, expect } from "vitest"` explicitly (no global test types wired into
  tsconfig).
- **Rationale**: Colocation is Vitest's default discovery and keeps a test next to what it
  guards. Explicit imports avoid adding `vitest/globals` to the app's TypeScript `types`
  (which would leak test globals into app type-checking). Node env because nothing under test
  touches the DOM.
- **Alternatives considered**: a separate `tests/` tree — more indirection for no benefit;
  global test APIs — rejected to keep app type config clean.

## Decision: Scope to pure functions; defer DB-touching orchestration

- **Decision**: Cover `sanity.isPriceSane`, `classify.isAccessory`, `colors.canonicalColor`/
  `colorLabel`, `text.normalizeText`/`searchTokens`, `similarity.*` (+ `scoreProductPair`),
  and `variant.variantConfig`/`detectNetwork`. Defer `matchOffer` (catalog query),
  `resolveVariant` (DB writes), and `pipeline.ts` to a later integration suite.
- **Rationale**: FR-003 + the reality that the matcher's risky *decisions* already live in the
  pure `similarity.ts` (post-009). Testing those plus the guards covers the tuning that gets
  regressed, without brittle Prisma mocks that would give false confidence (spec edge case).
- **Alternatives considered**: mock Prisma to test `matchOffer` now — rejected as premature;
  the DB glue is thin and better covered by a real-DB integration test later.

## Decision: Every function gets a positive AND a negative assertion (FR-005)

- **Decision**: Each covered behaviour pairs a should-pass case with a should-fail case
  (e.g. price within ±60% accepted / beyond rejected; "A56"≈"A56 5G" matches / "A56"≠"A17";
  qualifier "16"≠"16 Pro"; standalone accessory rejected / bundled-with-accessory phone kept).
- **Rationale**: A test that only checks the happy path won't catch a *loosened* guard —
  which is the most common regression. Pairing positive/negative makes SC-003 hold.

## Open questions

None.
