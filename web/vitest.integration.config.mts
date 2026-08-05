import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** DB-integration tests for the ingest orchestration that the pure-unit suite
 *  can't cover (matchOffer, resolveVariant, full pipeline). These hit a REAL
 *  Postgres — a dedicated `price_aggregator_test` database, NEVER the dev DB.
 *  Opt-in via `npm run test:integration`; the default `npm test` excludes them.
 *
 *  Point at a different DB with TEST_DATABASE_URL. The setup file refuses to
 *  run unless the URL name contains "test", as a guard against nuking dev data.
 *  Single fork so the tests don't race on the shared database. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./src/test/integration-setup.ts"],
    // Serialize: the tests share one database and must not race.
    pool: "forks",
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/price_aggregator_test?schema=public",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
