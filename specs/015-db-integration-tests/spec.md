# Feature Specification: DB-Integration Tests for the Ingest Core

**Feature Branch**: `015-db-integration-tests`

**Created**: 2026-08-05

**Status**: Done

**Input**: "Automated tests for the untested DB-touching ingest core (matchOffer, resolveVariant, full pipeline) — the biggest correctness risk. The spec-011 follow-on. Runs against your local Postgres."

## Why

Spec 011 added pure unit tests for the stateless ingest logic, but explicitly left the
DB-touching orchestration untested: `matchOffer` (catalog query), `resolveVariant` (find-or-
create), and the full `pipeline.ingest` (match → sanity → upsert → history → audit). That
orchestration is the highest-risk, most-tweaked code and had zero automated coverage —
regressions there silently corrupt the catalog. This feature adds an opt-in integration suite
that exercises those functions against a real (dedicated, disposable) Postgres.

## Requirements *(mandatory)*

- **FR-001**: An opt-in test suite MUST exercise `matchOffer`, `resolveVariant`, and the full
  `ingest` pipeline against a real Postgres, separate from the hermetic default `npm test`.
- **FR-002**: The suite MUST run only against a database whose name contains "test" and MUST
  refuse (throw) otherwise, so it can never touch dev/prod data.
- **FR-003**: Each test MUST start from a clean database (all app tables truncated) for
  isolation, and MUST NOT run in parallel against the shared DB.
- **FR-004**: The default `npm test` MUST remain DB-free and MUST NOT include these tests.
- **FR-005**: The suite MUST be runnable via a documented `npm run test:integration`, with the
  DB URL overridable by `TEST_DATABASE_URL`.

## Coverage (acceptance)

- **resolveVariant**: new storage → new variant; same storage (different RAM/network) → same
  variant; different storage → different variant; RAM/network enriched on later sighting but
  never overwritten.
- **matchOffer**: exact model-number match (confidence 1); bilingual token-overlap match;
  digit-token guard (A17 title ≠ A56 product); brand guard; empty catalog → null.
- **pipeline.ingest**: auto-create path writes product+variant+offer+history+audit and a
  SUCCESS run; accessory skipped (SKIPPED_ACCESSORY, no product); implausible price jump
  rejected + queued (REJECTED_PRICE, price unchanged); price history appended only on change;
  auto-approve-off routes unmatched offers to review (REVIEW_QUEUED, no product).

## Success Criteria *(mandatory)*

- **SC-001**: `npm run test:integration` passes with the ingest core covered (14 tests).
- **SC-002**: `npm test` stays DB-free and green (31 unit tests), excluding the integration suite.
- **SC-003**: Running the suite against a non-"test" DB fails fast with a clear guard error.

## Assumptions

- Local Postgres with a `price_aggregator_test` database (migrated via `prisma migrate deploy`)
  — created once; not committed, not CI-wired (solo local workflow, matching the constitution's
  "verify locally" stance). DB-integration in CI is a later concern.
- No production behavior changes — this is test-only code plus a second Vitest config/script.
