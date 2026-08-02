# Implementation Plan: Automated Tests for Ingest & Matching

**Branch**: `011-ingest-tests`

**Date**: 2026-08-02

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-ingest-tests/spec.md`

## Summary

Stand up **Vitest** in `web/` (dev-only, doesn't touch the Next build) and write fast,
deterministic, **database-free** unit tests over the highest-risk ingest/matching logic:
price sanity, accessory classification, colour canonicalization, Arabic-aware text
normalization/tokenization, the shared similarity primitives, duplicate pair scoring, and
storage-keyed variant config. Each behaviour asserts a positive and its guarded negative
(FR-005). One small enabling refactor: move the pure `scoreProductPair` out of
`lib/admin/duplicates.ts` (which imports Prisma) into `lib/ingest/similarity.ts` so the
scoring can be tested without pulling in the DB client.

## Technical Context

**Language/Version**: TypeScript 5, Node 22, Next.js 16 project (`web/`).

**Primary Dependencies (new, dev-only)**: `vitest`. Node test environment (no jsdom — pure
functions). No production dependency added.

**Storage**: None — tests are pure-function only; no DB, network, or app runtime (FR-003).

**Testing**: This feature *is* the test setup. Runner: Vitest via `npm test` (`vitest run`);
`npm run test:watch` for local iteration.

**Target Platform**: Developer machine / (later) CI; never the production build (FR-004).

**Project Type**: Web application, single `web/` service (tests live under `web/`).

**Performance Goals**: Whole suite green in a few seconds (SC-001).

**Constraints**: Tests must not require DB/network/app (FR-003); must not ship to or affect
the production build (FR-004) — Vitest + `*.test.ts` are dev-only and not imported by any
route; every covered function needs a positive AND a negative assertion (FR-005); the `@/`
path alias must resolve in the test runner.

**Scale/Scope**: ~8 test files over the pure lib functions + `vitest.config.mts` + 2 npm
scripts + the `scoreProductPair` extraction + a CLAUDE.md command note.

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | Tests target `lib/` functions directly; the `scoreProductPair` move keeps pure scoring in `lib/ingest/similarity.ts` (a `lib` module). |
| II. Bilingual by construction | PASS (reinforced) | Tests assert Arabic orthography folding and AR/EN colour aliases — locking in the bilingual guarantees. |
| III. Data trust | PASS (reinforced) | Tests pin the ±60% price-sanity guard and the matcher's digit/qualifier guards that protect catalog correctness. |
| IV. Ingest is a pipeline of stages | PASS | No pipeline change; tests cover the stage helpers. The `scoreProductPair` extraction is behaviour-preserving (mirrors 009's `similarity.ts` move). |
| V. Scraping | N/A | Untouched. |
| VI. Env-only config | PASS | No host config; Vitest config is committed, contains no secrets. |
| VII. Simplicity first | PASS | One dev dep (Vitest), no jsdom, no CI/coverage gates yet (explicitly deferred) — the minimum that yields a trustworthy suite. |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/011-ingest-tests/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── test-command-and-coverage.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
web/
├── package.json                         # EDIT: add vitest (devDep) + "test"/"test:watch" scripts
├── vitest.config.mts                    # NEW: node env + "@/" alias -> ./src (.mts = ESM loader, no config warning)
└── src/
    ├── lib/ingest/
    │   ├── similarity.ts                # EDIT: add pure scoreProductPair (moved from duplicates.ts)
    │   ├── similarity.test.ts           # NEW: tokenize/overlap/model-guard/qualifier/brand + scoreProductPair
    │   ├── sanity.test.ts               # NEW: isPriceSane (±60%, first-sighting, non-positive)
    │   ├── classify.test.ts             # NEW: isAccessory (standalone vs bundle vs phone)
    │   └── variant.test.ts              # NEW: variantConfig + detectNetwork
    ├── lib/admin/
    │   └── duplicates.ts                # EDIT: import scoreProductPair from similarity (re-export for callers)
    ├── lib/
    │   └── text.test.ts                 # NEW: normalizeText + searchTokens
    └── lib/catalog/
        └── colors.test.ts               # NEW: canonicalColor + colorLabel
```

**Structure Decision**: Colocate `*.test.ts` beside the code they cover (standard Vitest
discovery, easy `@/` or relative imports). They are never imported by an `app/` route, so the
Next production build excludes them (FR-004). Move `scoreProductPair` to `similarity.ts` so
the pure scoring is importable without the Prisma client.

## Complexity Tracking

> Not applicable — no violations.
