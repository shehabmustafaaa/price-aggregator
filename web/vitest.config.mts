import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** Dev-only unit tests for the pure ingest/matching logic. Node environment
 *  (no DOM), and the "@/" alias resolves to ./src so tests can import
 *  "@/lib/...". Not referenced by any app route, so `next build` is untouched. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
