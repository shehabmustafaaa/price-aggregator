# Tasks: DB-Integration Tests for the Ingest Core

**Feature**: `015-db-integration-tests` | **Spec**: [spec.md](./spec.md)

- [x] **T001** Create a dedicated `price_aggregator_test` Postgres DB and apply migrations
  (`DATABASE_URL=…price_aggregator_test npx prisma migrate deploy`). (FR-001)
- [x] **T002** `web/vitest.integration.config.mts`: include `*.integration.test.ts`, setup file,
  `pool: forks` + `fileParallelism: false` (no DB races), `env.DATABASE_URL` from
  `TEST_DATABASE_URL` or the local test DB. (FR-001,003,005)
- [x] **T003** `web/src/test/integration-setup.ts`: guard (DB name must contain "test" or throw),
  `resetDb()` (name-agnostic TRUNCATE of all app tables), `seedBase()` (category/store/brand),
  `beforeEach` reset, `afterAll` disconnect. (FR-002,003)
- [x] **T004** `web/vitest.config.mts`: exclude `*.integration.test.ts` from the default suite;
  add `test:integration` script. (FR-004,005)
- [x] **T005** `variant.integration.test.ts` (4 tests) — resolveVariant. (coverage)
- [x] **T006** `match.integration.test.ts` (5 tests) — matchOffer. (coverage)
- [x] **T007** `pipeline.integration.test.ts` (6 tests, incl. accessory/reject/history/review). (coverage)
- [x] **T008** Verified: `npm run test:integration` → 14 pass; `npm test` → 31 pass, DB-free.
  Updated CLAUDE.md commands + BACKLOG. Commit + push. (SC-001,002)
