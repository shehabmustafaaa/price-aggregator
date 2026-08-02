# Phase 1 Data Model: Automated Tests for Ingest & Matching

No data entities — this feature adds a test suite over existing pure functions. There is no
database, no migration, and no runtime state.

## Functions under test (the "model" here is the behaviour surface)

| Module | Function | Pure? | Covered |
|---|---|---|---|
| `lib/ingest/sanity.ts` | `isPriceSane(existing, newPrice)` | ✓ | yes |
| `lib/ingest/classify.ts` | `isAccessory(title)` | ✓ | yes |
| `lib/ingest/similarity.ts` | `tokenize`, `overlapScore`, `hasAllModelTokens`, `qualifiersMatch`, `sameBrand`, `normalizeArabic` | ✓ | yes |
| `lib/ingest/similarity.ts` | `scoreProductPair` (moved here from `duplicates.ts`) | ✓ | yes |
| `lib/ingest/variant.ts` | `variantConfig(attrs, title)`, `detectNetwork(title)` | ✓ | yes |
| `lib/text.ts` | `normalizeText(text)`, `searchTokens(query)` | ✓ | yes |
| `lib/catalog/colors.ts` | `canonicalColor(raw)`, `colorLabel(key, locale)` | ✓ | yes |
| `lib/ingest/match.ts` | `matchOffer(raw, categoryId)` | ✗ (Prisma) | deferred |
| `lib/ingest/variant.ts` | `resolveVariant(db, …)` | ✗ (Prisma) | deferred |
| `lib/ingest/pipeline.ts` | `ingest(payload)` | ✗ (Prisma) | deferred |

## Test artifact shape

- One `*.test.ts` per source module, colocated; each groups cases with `describe`/`it`.
- No fixtures/factories beyond inline literals; no shared mutable state between tests
  (determinism, FR-003).

## Invariants the suite encodes

- Every listed pure function has ≥1 passing case and ≥1 guarded-failing case (FR-005/SC-002).
- The suite exits non-zero on any failure (FR-001) and needs no DB/network/app (FR-003).
