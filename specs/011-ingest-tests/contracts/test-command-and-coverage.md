# Contracts: Test Command & Coverage Matrix

## Command contract

| Command | Behaviour |
|---|---|
| `cd web && npm test` | Runs the full suite once (`vitest run`); exits **0** if all pass, **non-zero** on any failure (FR-001). No DB/network/app required. |
| `cd web && npm run test:watch` | Vitest watch mode for local iteration. |

- Config: `web/vitest.config.ts` — `test.environment = "node"`, `resolve.alias` maps `@` →
  `<web>/src` so tests can import `@/lib/...`.
- Dev-only: `vitest` is a `devDependency`; no test file is imported by any `app/` route, so
  `next build` output is unaffected (FR-004 / SC-004).

## Coverage matrix (each = positive + guarded-negative, FR-005)

| Behaviour | Positive assertion | Guarded-negative assertion |
|---|---|---|
| Price sanity | within ±60% accepted; first sighting (`existing=null`) accepted | jump > 60% rejected; `newPrice ≤ 0` rejected |
| Accessory filter | standalone accessory title → rejected | phone / phone-bundled-with-accessory → kept |
| Colour canonical | AR + EN aliases → one canonical key (e.g. "اسود"/"Ink Black" → `black`) | unknown colour → passthrough (unchanged) |
| Text normalize | alef/hamza/taa-marbuta/alef-maqsura variants normalize equal | genuinely different words do not normalize equal |
| Tokenize/overlap | shared tokens produce expected overlap | disjoint tokens → 0 |
| Model-token guard | name whose digit tokens ⊆ listing passes | differing digit token (A56 vs A17) fails |
| Qualifier guard | identical qualifier sets pass | "16" vs "16 Pro" fails |
| Brand equality | case/space-insensitive equal brands match | different brands don't |
| Duplicate scoring | genuine dup (incl. 5G/storage noise) scores high (≥ threshold) | different model / different qualifier scores 0 |
| Variant config | `variantConfig` reads storage/ram; `detectNetwork` finds 5G/4G/LTE | no-network title → `network = null` |

## Non-contract (explicitly out)

- No DB-integration tests (`matchOffer`, `resolveVariant`, `pipeline`) — deferred.
- No E2E/browser tests, no CI wiring, no coverage thresholds/gates.
