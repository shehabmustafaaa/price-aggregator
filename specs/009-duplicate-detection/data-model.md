# Phase 1 Data Model: Duplicate-Product Detection & Merge Suggestions

## New entity (one migration)

### DuplicateDismissal (`duplicate_dismissals`)

A durable "these two products are NOT duplicates" decision, keyed on the unordered pair.

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `productLoId` | int | the smaller of the two product ids (canonical) |
| `productHiId` | int | the larger of the two product ids |
| `createdAt` | DateTime | when dismissed |

- **Constraints**: `@@unique([productLoId, productHiId])`; write path enforces
  `productLoId < productHiId` so A–B and B–A map to one row (FR-006).
- **No FK cascade** to `products`: the row is advisory (edge case 3) — if a product is later
  deleted/merged, the row just stops matching any live pair. Indexed by the unique pair for
  fast exclusion during candidate computation.
- Prisma model maps to `duplicate_dismissals` (snake_case table, per house convention).

## Existing entities (read / reuse only)

- **Product / Brand**: compared using `brand`, `nameEn`, `nameAr`, `modelNumber`; displayed
  with an image and offer/variant counts. Unchanged.
- **ProductVariant / Offer**: counted per product for display (how many offers/variants each
  side has) so the admin can judge which should survive. Unchanged.
- **mergeProducts** (`lib/admin/catalog.ts`): the existing transactional merge reused verbatim
  by the merge action — consolidates variants/offers/history/favorites/alerts onto the
  survivor, deletes the source.

## Transient shapes (computed, not stored)

### DuplicateCandidate

| Field | Derivation |
|---|---|
| `a`, `b` | the two products (id, nameEn, nameAr, brand, first image, offerCount, variantCount) |
| `score` | `scoreProductPair(a, b)` ∈ (0, 1] |

- Produced per page load by `findDuplicateCandidates(limit)`: group products by
  `(categoryId, brandId)`, score intra-group pairs, keep `score ≥ THRESHOLD`, drop pairs
  present in `duplicate_dismissals`, sort by `score` desc, take top `limit` (default 100).
- **Invariants**: `a` and `b` are always the same category (SC-005); each unordered pair
  appears at most once; dismissed pairs never appear (FR-005).

## Operations

| Operation | Effect |
|---|---|
| `findDuplicateCandidates(limit=100)` | compute + rank the candidate list (read-only) |
| `dismissDuplicatePair(idA, idB)` | upsert a canonical `(lo,hi)` row; idempotent; no-op if already dismissed |
| merge (via `mergeProducts(sourceId, targetId)`) | existing behavior; pair vanishes because one product ceases to exist |

## State transitions

```
pair (computed): shown ──dismiss──▶ suppressed (duplicate_dismissals row)
                 shown ──merge───▶ gone (one product deleted by mergeProducts)
```
