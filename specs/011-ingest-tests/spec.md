# Feature Specification: Automated Tests for Ingest & Matching

**Feature Branch**: `011-ingest-tests`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Automated tests for ingest/matching — the matcher is the
riskiest, most-tweaked code and has zero tests. Stand up a test runner and cover the ingest/
matching logic so regressions are caught before they reach production."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catch matching/ingest regressions before they ship (Priority: P1)

As the maintainer, before committing a change to the matcher or an ingest guard, I run one
command and get fast, deterministic pass/fail feedback on the behaviours that matter —
product matching, price sanity, accessory filtering, colour canonicalization, variant keying,
Arabic-aware text handling, and duplicate scoring — so a tweak that silently breaks matching
is caught locally instead of in production.

**Why this priority**: The matcher and ingest guards are the most-tweaked, highest-risk code
in the system and currently have zero tests; a single unnoticed regression corrupts the
catalog for every shopper. A runnable, trustworthy test suite over this logic is the whole
point of the feature.

**Independent Test**: From the `web/` project, run the test command; confirm it discovers and
runs the suite and reports a green result, and that deliberately breaking one guard (e.g.
loosening the price-sanity bound) turns the relevant test red.

**Acceptance Scenarios**:

1. **Given** the test runner is set up, **When** the maintainer runs the test command,
   **Then** the ingest/matching test suite executes and reports pass/fail per test, exiting
   non-zero if any test fails.
2. **Given** a passing suite, **When** a core guard is deliberately altered to the wrong
   behaviour (e.g. the ±60% price-sanity threshold, or the digit-token match guard), **Then**
   at least one test fails and names the broken behaviour.
3. **Given** the suite, **When** it runs, **Then** it completes quickly and deterministically
   without needing a database, network, or the running app (pure-function unit tests).

---

### User Story 2 - Encode the tricky known behaviours as executable examples (Priority: P2)

As the maintainer, I want the specific edge cases the matcher was carefully tuned for —
Arabic spelling variants, digit-token model distinctions (A56 vs A17), qualifier distinctions
(16 vs 16 Pro), accessory-vs-bundle titles, colour aliases, storage-keyed variants — captured
as named tests, so the intent behind the tuning is documented and protected.

**Why this priority**: These are exactly the cases that get accidentally regressed by a
"small" change; encoding them makes the rules explicit and self-checking. Valuable, but
secondary to simply having the runner and a green baseline (US1).

**Independent Test**: Read the test names/cases and confirm each documented tricky behaviour
from the existing code comments has a corresponding assertion.

**Acceptance Scenarios**:

1. **Given** the matching/scoring tests, **Then** they assert that a genuine duplicate/variant
   spelling matches while a different model (differing digit token) or a differing qualifier
   does not.
2. **Given** the text/colour tests, **Then** they assert Arabic orthographic variants normalize
   equal and that known colour aliases (Arabic and English) map to one canonical colour.
3. **Given** the accessory tests, **Then** they assert a standalone accessory title is filtered
   while a phone bundled with a free accessory is kept.

---

### Edge Cases

- The suite must not depend on external state (DB, network, env-specific config); tests that
  would require a database (the parts of matching/variant-resolution that query the catalog)
  are out of scope for this first suite and are noted as future integration-test work rather
  than faked unwisely.
- A test must fail loudly if the behaviour it guards changes — no silently-skipped or
  always-green tests.
- The test tooling must not ship in, or affect, the production build/runtime.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `web/` project MUST have a test runner configured with a single command
  (e.g. an `npm` script) that discovers and executes the test suite and exits non-zero on any
  failure.
- **FR-002**: The suite MUST cover the pure, database-free ingest/matching logic, at minimum:
  - price sanity (±60% jump rejection, first-sighting acceptance, non-positive rejection);
  - accessory classification (standalone accessory rejected; phone / bundled-with-accessory
    kept);
  - colour canonicalization (Arabic + English aliases → one canonical key; unknown passes
    through);
  - Arabic-aware text normalization and tokenization (alef/hamza/taa-marbuta/alef-maqsura
    folding; tokenization rules);
  - the shared similarity primitives (token overlap, digit-token model guard, qualifier
    agreement, brand equality);
  - duplicate pair scoring (genuine duplicate scores high; different model / different
    qualifier score zero);
  - storage-keyed variant configuration derivation.
- **FR-003**: Tests MUST be deterministic and run without a database, network, or the running
  application; suites requiring those are explicitly deferred (documented, not stubbed into
  false confidence).
- **FR-004**: The test tooling and test files MUST NOT be included in or affect the production
  build or runtime output.
- **FR-005**: Each covered behaviour MUST assert both the positive case and its guarded
  negative (e.g. a matching case AND a deliberately-non-matching case), so a loosened guard is
  caught.
- **FR-006**: The test command and how to run it MUST be documented (in the project's
  developer docs / CLAUDE.md commands section) so it is discoverable.

### Key Entities

- **Test suite / test files**: developer-facing assertions colocated with or near the `web/`
  source; no runtime entity, no database, no user-facing surface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A single documented command runs the whole suite and returns a clear pass/fail
  in a few seconds, with no database or network required.
- **SC-002**: Every pure ingest/matching function listed in FR-002 has at least one positive
  and one negative assertion.
- **SC-003**: Deliberately reverting any one of the guards under test (price bound, digit-token
  guard, qualifier guard, accessory rule) causes at least one test to fail.
- **SC-004**: Running the production build still succeeds and produces no test tooling in its
  output.

## Assumptions

- This first suite targets the **pure, DB-free** logic where the risk and tuning concentrate
  (`lib/ingest/{sanity,classify,similarity,variant}.ts`, `lib/text.ts`,
  `lib/catalog/colors.ts`, `lib/admin/duplicates.ts` scoring). DB-touching orchestration
  (`matchOffer`'s catalog query, `resolveVariant`, the full `pipeline.ts`) is deferred to a
  later integration-test effort — noted, not faked.
- A lightweight, fast unit-test runner appropriate to the TypeScript/Next stack is acceptable;
  the exact tool is an implementation choice made during planning (it must be dev-only and not
  affect the production build).
- The constitution's "test after a batch of related features" stance is honoured: this feature
  is that batch's test pass for the highest-risk area, not a mandate for exhaustive coverage
  everywhere.
- Out of scope: end-to-end/browser tests, DB integration tests, CI wiring (can follow once a
  green suite exists), and coverage thresholds/gates.
