# Feature Specification: Search & Browse

**Feature Branch**: `002-search-and-browse`

**Created**: 2026-07-22

**Status**: Baseline — describes behavior already built and live at https://shehabw1.space.
Verified against the running product and current codebase (`web/src/lib/text.ts`, search
routes under `web/src/app/[locale]/`). Discrepancies discovered later should be resolved by
`/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.

**Input**: Split from the original combined baseline spec (`001-asaar-baseline`) into one
spec per domain so each can evolve independently. This spec owns: bilingual
Arabic-orthography-normalized search, missed-search logging, category browsing, pagination,
and brand/price/spec filters — the discovery layer that makes
[[001-catalog-comparison]] reachable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find products by search and browse (Priority: P1)

A shopper finds products by typing a query in Arabic or English (with tolerant spelling, e.g.
alef variants), or by browsing the category with filters (brand, price, specs) and
pagination.

**Why this priority**: Discovery is the entry point to comparison; without it
[[001-catalog-comparison]] is unreachable.

**Independent Test**: Search for a known product using an Arabic spelling that differs from
the stored one; verify it is found. Apply a brand filter; verify only that brand's products
remain.

**Acceptance Scenarios**:

1. **Given** a product whose stored name uses one Arabic orthography, **When** the shopper
   searches using a variant spelling, **Then** the product is found.
2. **Given** a store lists a product under a different title than the catalog name, **When**
   the shopper searches by the store's wording, **Then** the product is still found.
3. **Given** a category page with many products, **When** the shopper pages through results or
   applies brand/price/spec filters, **Then** results update accordingly.
4. **Given** a search with no results, **Then** the query is logged for later catalog-gap
   analysis.

---

### Edge Cases

- A store's raw listing title differs substantially from the catalog product name — the search
  index must still surface the catalog product for that wording.
- A search yields zero results — the query itself is still valuable signal and must be logged,
  not silently dropped.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide bilingual, orthography-normalized token search (Arabic alef
  variants, digit normalization) whose index includes store-listing titles (both fresh and
  stale offers' titles, since a wording match is useful even if the specific offer is
  currently hidden by the freshness gate).
- **FR-002**: System MUST log every zero-result search query (text + locale) for later
  catalog-gap analysis.
- **FR-003**: System MUST provide category browsing with pagination and brand/price/spec
  filters, plus home-page pagination for the default product listing.

### Key Entities

- **Category**: hierarchical taxonomy node (bilingual name, slug, optional parent); drives
  browse pages and which stores are scraped for it (see [[005-scraping-ingest]]).
- **Brand**: bilingual/slugged brand used as a filter facet and on product records.
- **SpecDefinition**: per-category filterable spec facet (key, label, unit, filter type:
  range/multi/boolean) that drives which filters render on a category's browse page.
- **MissedSearch**: a logged zero-result query (text, locale, timestamp).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A searcher using either language or a common Arabic spelling variant finds an
  existing product on the first query in ≥90% of attempts.

## Assumptions

- Mobile phones are the launch category; the data model is category-extensible by inserting
  `Category`/`SpecDefinition` rows, not migrating schema (constitution VI).
- Store listing titles routinely diverge from catalog names, so the search index must cover
  both.
- No automated test suite exists yet (tracked in `BACKLOG.md`); verify search/filter changes
  manually against the running site.
- This spec documents built behavior; discrepancies discovered later should be resolved by
  `/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.
