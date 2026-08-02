# Quickstart: Automated Tests for Ingest & Matching

## Prerequisites

- `cd web && npm install` (pulls the new `vitest` dev dependency).

## Scenario 1 — Suite runs green, fast, no DB (US1/AC1, US1/AC3, SC-001)

1. `cd web && npm test`.
2. Expect: Vitest discovers the `*.test.ts` files, runs them in a few seconds, reports
   per-test pass/fail, and exits **0** — with no database or network involved.

## Scenario 2 — A broken guard turns the suite red (US1/AC2, SC-003)

1. Temporarily loosen a guard, e.g. change `MAX_JUMP_RATIO` in `lib/ingest/sanity.ts` from
   `0.6` to `5`, or make `qualifiersMatch` always return `true` in `lib/ingest/similarity.ts`.
2. `npm test` → at least one test fails and names the behaviour (price sanity / qualifier
   guard).
3. Revert the change → suite green again.

## Scenario 3 — Tricky known cases are encoded (US2)

1. Read the test names in `similarity.test.ts`, `text.test.ts`, `colors.test.ts`,
   `classify.test.ts`.
2. Confirm assertions exist for: Arabic spelling variants normalize equal; A56 ≠ A17;
   16 ≠ 16 Pro; standalone accessory rejected while a bundled phone is kept; AR/EN colour
   aliases map to one canonical colour; a genuine duplicate scores high while a different
   model scores 0.

## Scenario 4 — Positive + negative per behaviour (SC-002, FR-005)

1. Skim each `*.test.ts`: every covered function has at least one should-pass and one
   should-fail assertion.

## Scenario 5 — Production build unaffected (FR-004, SC-004)

1. `cd web && rm -rf .next && npm run build` → build succeeds.
2. Confirm no `vitest`/`*.test.ts` appears in the build output (test files aren't imported by
   any route, so they're excluded).
