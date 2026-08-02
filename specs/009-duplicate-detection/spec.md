# Feature Specification: Duplicate-Product Detection & Merge Suggestions

**Feature Branch**: `009-duplicate-detection`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Duplicate-product detection & merge suggestions — auto-created
products from scrapers produce near-dupes; admin merge tool exists, suggestions don't. Build
an admin-only page that surfaces likely-duplicate product pairs ranked by similarity, each
with a one-click merge (into the existing merge tool) and a 'not a duplicate' dismiss that
persists."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See likely duplicate products ranked by similarity (Priority: P1)

The site owner (admin) opens a page that lists pairs of products in the same category that are
probably the same phone (created twice by the scrapers under slightly different titles), most
confident matches first, so they can clean up the catalog without hunting for dupes manually.

**Why this priority**: This is the feature's core value — turning the existing similarity
knowledge into a review list. Without the ranked pair list there is nothing to act on. This
story alone is a usable MVP (even read-only, it tells the owner where the dupes are).

**Independent Test**: With at least two near-duplicate products in the catalog (e.g. same
brand+model created from two store titles), open the duplicates page and confirm the pair
appears with a similarity indicator, most-similar first, showing enough of each product
(name, brand, image, offer/variant count) to judge them.

**Acceptance Scenarios**:

1. **Given** two products in the same category that are likely the same phone, **When** the
   admin opens the duplicates page, **Then** they see the pair listed once, with each
   product's key details and a similarity score, ordered with the most-similar pairs first.
2. **Given** the admin is not signed in as an admin, **When** they visit the duplicates page
   URL, **Then** they see the standard admin gate and not the data.
3. **Given** there are no likely-duplicate pairs (or all have been dismissed), **When** the
   admin opens the page, **Then** they see a clear empty state, not an error or blank page.
4. **Given** two products in **different** categories that happen to share a name, **When**
   the page is computed, **Then** they are **not** offered as a duplicate pair (comparison is
   within a category only).

---

### User Story 2 - Merge a confirmed duplicate in one click (Priority: P1)

When the owner confirms a pair is truly the same phone, they merge it directly from the
suggestions list — one product absorbs the other's offers, price history, variants,
favorites, and alerts — reusing the existing catalog merge behavior.

**Why this priority**: Detection is only useful if acting on it is fast; the merge is the
payoff. Tied P1 with US1 because a suggestion you can't act on in place is half a feature.

**Independent Test**: From a listed pair, merge one product into the other and confirm the
survivor gains the other's offers/variants and the pair no longer appears.

**Acceptance Scenarios**:

1. **Given** a suggested pair, **When** the admin merges it (choosing which product survives),
   **Then** the two products are consolidated by the existing merge tool (offers, price
   history, variants, favorites, alerts move to the survivor; the other product is removed)
   and the pair disappears from the list.
2. **Given** a merged pair, **When** the page reloads, **Then** the merged-away product is
   gone and the pair does not reappear.
3. **Given** the admin must decide direction, **When** they act on a pair, **Then** it is
   clear which product will survive and which will be absorbed before they confirm.

---

### User Story 3 - Dismiss a false positive so it stays gone (Priority: P2)

Some suggested pairs are genuinely different phones that only look similar (e.g. 4G vs 5G, or
two storage tiers modeled as separate products). The owner marks such a pair "not a
duplicate" so it stops cluttering the list on every visit.

**Why this priority**: Keeps the list actionable over time; without it the same false
positives reappear forever. Ranks below the detect+merge core.

**Independent Test**: Dismiss a pair, confirm it disappears and does not reappear on reload or
on subsequent recomputations.

**Acceptance Scenarios**:

1. **Given** a suggested pair the admin judges to be different products, **When** they dismiss
   it, **Then** the pair is removed from the list and does not reappear on reload.
2. **Given** a dismissed pair, **When** the duplicate list is recomputed later (both products
   still exist), **Then** the pair is still suppressed.
3. **Given** one product of a dismissed pair is later deleted or merged away, **Then** the
   stale dismissal record does not cause errors and simply no longer applies.

---

### Edge Cases

- The same product can be similar to several others; it may appear in more than one pair. Each
  distinct pair is listed once (A–B and B–A are the same pair, shown once).
- Products with empty/placeholder specs and `nameEn == nameAr` (raw auto-created titles) are
  the common dupe source — detection must work from names/brand/model even when specs are
  empty.
- A very large catalog must still compute usefully — comparison is bounded (within category,
  reasonable candidate limits) and the page shows the top-N most-confident pairs rather than
  every possible pair.
- Merging or dismissing a pair that another action already resolved does not error; the page
  reflects current state on reload.
- 4G vs 5G (or different storage) products that are intentionally separate are expected false
  positives — the dismiss flow (US3) is how they're handled, not a detection bug.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an admin-only page that lists likely-duplicate product
  pairs, reachable only by a signed-in admin (same gating as other admin pages); non-admins
  MUST see the standard admin gate.
- **FR-002**: The system MUST compare products **within the same category only** and score
  each candidate pair for similarity using the site's existing name/brand/model matching
  logic (normalized bilingual token overlap, brand agreement, digit/qualifier guards),
  reusing the matcher primitives rather than a new heuristic.
- **FR-003**: The page MUST list each candidate pair once, ordered by similarity score
  (most-likely duplicates first), showing enough of each product to judge it (bilingual name,
  brand, an image if any, and offer/variant counts) and the score.
- **FR-004**: The admin MUST be able to merge a listed pair in one action, choosing which
  product survives, using the existing merge behavior (consolidating offers, price history,
  variants, favorites, and alerts onto the survivor and removing the other); after merge the
  pair MUST no longer appear.
- **FR-005**: The admin MUST be able to dismiss a pair as "not a duplicate"; a dismissed pair
  MUST NOT reappear on reload or on later recomputation while both products still exist.
- **FR-006**: Dismissals MUST be stored durably and keyed to the pair of products regardless
  of order (dismissing A–B also suppresses B–A).
- **FR-007**: The page MUST show a clear empty state when there are no candidate pairs (or all
  are dismissed/resolved).
- **FR-008**: The page MUST bound its work (candidate pairs limited to a top-N of the
  highest-scoring, comparison confined per category) so it renders usefully on a large
  catalog.
- **FR-009**: The page MUST be English-only, consistent with the existing admin surfaces.
- **FR-010**: Aside from the merge action (which uses the existing merge behavior) and storing
  dismissals, the page MUST NOT modify catalog or scraper data — it does not create products,
  edit fields, or trigger scrapes.

### Key Entities

- **Product** (existing): the items compared and merged; comparison uses brand, bilingual
  names, and model number. No change to the product entity.
- **Duplicate Candidate Pair** (computed, not stored): a pair of same-category products with a
  similarity score, produced on page load; ordered by score; excludes dismissed pairs.
- **Duplicate Dismissal** (new, stored): a durable record that a specific unordered pair of
  products has been marked "not a duplicate", used to suppress that pair from future lists.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the admin area, the owner can reach the duplicates list and see the
  single most-likely duplicate pair at the top in under 30 seconds.
- **SC-002**: A genuine near-duplicate pair (same brand+model, differing only by store-title
  wording) reliably appears in the list; merging it from the page leaves one product carrying
  both originals' offers and history.
- **SC-003**: A dismissed pair never reappears on subsequent visits while both products exist.
- **SC-004**: A non-admin visitor can never view duplicate suggestions through this page.
- **SC-005**: No cross-category pair is ever suggested.

## Assumptions

- Reuses the existing merge behavior (`mergeProducts`) and the existing similarity primitives
  from the ingest matcher (`normalizeText` + token-overlap/brand/qualifier helpers) — this
  feature adds detection UI + dismissal persistence, not a new matching algorithm.
- "Dismiss" is stored in a small new table keyed on the unordered product-id pair; it records
  a decision, not an archived pair state. A schema migration adds this one table; no existing
  table changes.
- Similarity comparison is bounded per category with a candidate cap and a top-N result list;
  the exact thresholds/limits are implementation details chosen during planning (a
  score threshold near the matcher's existing confidence cutoff is a reasonable default).
- Expected false positives (4G/5G, storage tiers modeled separately) are handled by dismissal,
  not by special-casing detection — consistent with the existing "known loose end" that such
  variants can look alike.
- The admin surface reuses existing admin auth/gating and the English-only convention; no new
  roles or permissions.
- Out of scope: automatic/unattended merging (a human always confirms), bulk-merge of many
  pairs at once, cross-category dedupe, and editing product fields from this page (the
  existing catalog edit page covers that).
