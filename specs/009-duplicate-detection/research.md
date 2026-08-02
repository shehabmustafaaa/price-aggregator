# Phase 0 Research: Duplicate-Product Detection & Merge Suggestions

No `NEEDS CLARIFICATION` markers. Two decisions were pre-approved by the owner (new dismissal
table; per-category bounded matching); the rest settle scoring and reuse.

## Decision: Extract the matcher's scoring helpers into a shared `lib/ingest/similarity.ts`

- **Decision**: Move the pure functions currently private in `lib/ingest/match.ts` —
  `tokenize`, `overlapScore`, `hasAllModelTokens`, `qualifiersMatch`, `sameBrand`,
  `normalizeArabic` (+ the `QUALIFIERS` set) — into a new `lib/ingest/similarity.ts` and have
  `match.ts` import them. `lib/admin/duplicates.ts` imports the same module.
- **Rationale**: FR-002 requires reusing the site's existing matching logic, not a new
  heuristic. The helpers are currently unexported, so duplicate-detection can't call them
  without either copying (drift risk, violates DRY/constitution I) or exporting. A behavior-
  preserving extraction keeps one implementation for both ingest and detection.
- **Alternatives considered**: (a) just `export` them from `match.ts` — works, but
  `duplicates.ts` importing from the ingest matcher couples admin tooling to the pipeline
  file; a neutral `similarity.ts` reads better. (b) reimplement scoring in `duplicates.ts` —
  rejected: guaranteed to drift from the matcher over time.

## Decision: Score products pairwise, symmetric, brand-gated

- **Decision**: `scoreProductPair(a, b)` returns 0 if the two products' brands disagree
  (`sameBrand`, treating null brand as its own group), else tokenizes each product's combined
  name text (`brand + nameEn` and `nameAr`) and computes a symmetric similarity: require the
  digit-token guard (`hasAllModelTokens`) **both directions** and qualifier agreement
  (`qualifiersMatch`), then take the token-overlap score (min of the two directional
  `overlapScore`s, or Jaccard — chosen in implementation) across the best of EN/AR.
- **Rationale**: The ingest matcher is offer→product (asymmetric: "are all the product's model
  tokens in the listing?"). Product→product must be symmetric (either could be the survivor),
  so the digit/qualifier guards apply both ways; this preserves the matcher's core protection
  against "iPhone 16" ≈ "iPhone 16 Pro" and "A56" ≈ "A17".
- **Alternatives considered**: raw Jaccard with no digit/qualifier guard — rejected: it's
  exactly what produces the 4G/5G and storage-tier false positives the spec wants minimized;
  the guards keep those out unless names are otherwise near-identical (and if they slip
  through, US3 dismiss handles them).

## Decision: Bound compute by (category, brand) grouping + caps

- **Decision**: Load candidate products grouped by `(categoryId, brandId)`; only compare
  within a group (brand must agree anyway). Skip groups larger than a per-group cap
  (e.g. 300) defensively; collect all pairs scoring ≥ threshold across groups; exclude
  dismissed pairs; sort by score desc; return the global top-N (e.g. 100).
- **Rationale**: Brand agreement is a hard requirement (FR-002), so grouping by brand both
  enforces it and turns a catalog-wide O(n²) into O(Σ kᵢ²) over small brand groups — cheap at
  current scale (constitution VII). Per-category satisfies SC-005 (no cross-category pairs).
- **Alternatives considered**: full O(n²) over the category — unnecessary work; a precomputed/
  cached candidate table — premature (recompute-on-load is fine at this size).

## Decision: Score threshold near the matcher's existing cutoff

- **Decision**: Default candidate threshold ≈ `0.6` (the matcher's `CONFIDENCE_THRESHOLD`),
  tunable via a single named constant in `duplicates.ts`.
- **Rationale**: Consistency with the confidence level the pipeline already treats as "same
  product"; keeps the list high-precision so the owner isn't wading through weak guesses.
- **Alternatives considered**: a lower recall-favoring threshold — rejected: false positives
  erode trust in the tool; better to miss a borderline pair than flood the list (and dismissed
  noise would accumulate).

## Decision: Dismissals keyed on the canonical unordered pair

- **Decision**: `DuplicateDismissal` stores `(productLoId, productHiId)` with
  `productLoId < productHiId` enforced at write time and a unique constraint on the pair.
  `dismissDuplicatePair(a, b)` canonicalizes before insert; candidate computation left-joins /
  filters these out.
- **Rationale**: FR-006 — dismissing A–B must also suppress B–A. Canonicalizing to
  (min,max) makes the pair a single stable key with a natural unique index.
- **Stale handling**: if one product is later deleted/merged, the dismissal row simply never
  matches a live pair again (harmless). A later cleanup could delete orphaned rows, but it's
  not required (edge case 3) — no FK cascade needed since the row is advisory.

## Open questions

None.
