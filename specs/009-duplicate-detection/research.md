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

- **Decision**: `scoreProductPair(a, b)` is brand-gated (0 when brands disagree — enforced by
  the caller's grouping, null brand its own group), then mirrors the ingest matcher
  **asymmetrically, in both orientations, taking the max**: for each ordering it treats one
  product's tokens as the canonical "name" and the other's as the noisier "listing", requires
  the name's digit-bearing tokens to appear in the listing (`hasAllModelTokens`) and qualifier
  agreement (`qualifiersMatch`), and scores the fraction of name tokens found (`overlapScore`).
  The pair's score is `max(dir(a,b), dir(b,a))` across the best of EN/AR — so the function is
  still symmetric as a whole (`score(a,b) == score(b,a)`).
- **Rationale**: The ingest matcher is offer→product (asymmetric: "are all the product's model
  tokens in the listing?"). A **symmetric-`min()` / both-directions-must-hold** variant was the
  initial design but was **rejected during implementation**: it scores a genuine duplicate at 0
  whenever one side carries extra tokens the other lacks (e.g. "Galaxy A56 5G 256GB" vs "Galaxy
  A56" → `min` direction fails on `5g`/`256gb`), a false negative confirmed by a runtime check.
  Trying each side as the clean "name" and taking the max keeps the matcher's protection against
  "iPhone 16" ≈ "iPhone 16 Pro" and "A56" ≈ "A17" (the guards still fail those in both
  orientations) while tolerating listing noise — exactly the offer→product behavior, symmetrized.
- **Alternatives considered**: (a) symmetric `min()` with both-direction guards — rejected as
  above (false-negatives noisy-vs-clean dupes). (b) raw Jaccard with no digit/qualifier guard —
  rejected: it produces the 4G/5G and storage-tier false positives (in practice those score 0
  here because their differing digit tokens fail the guard; if any slipped through, US3 dismiss
  is the backstop).

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
