# Phase 1 Data Model: Search & Browse

**Status**: Baseline — reflects `web/prisma/schema.prisma` as built.

## Entities in scope

### Category

Hierarchical taxonomy node: `slug` (route key), bilingual `nameEn`/`nameAr`, optional
`parentId` (self-relation `CategoryTree`). Drives `/c/[slug]` browse pages.

- Relationship: `Category 1 — N Product`, `Category 1 — N SpecDefinition`,
  `Category N — N Store` via `CategoryStore` (which stores get scraped for this category —
  read here only to know a category exists; scheduling itself is
  [[005-scraping-ingest]]'s).

### SpecDefinition

Per-category filterable facet: `key` (e.g. `ram_gb`, `storage_gb`, `has_5g`), bilingual
`labelEn`/`labelAr`, optional `unit`, `filterType` (`range` | `multi` | `boolean`),
`sortOrder`.

- **Invariant**: adding a new filterable spec to a category is an insert of one
  `SpecDefinition` row — no schema migration (constitution VI). Browse-page filter chips are
  driven entirely by which rows exist for the current category.

### Brand

`slug`, `name`; used both as a `Product` field and a browse-page filter facet
(`listBrandsInCategory` returns only brands with ≥1 product in the category).

### MissedSearch

Append-only zero-result query log: `query` (raw text, trimmed), `locale`, `createdAt`.

- **Invariant**: written exactly once per search call that yields zero matches — never
  deduplicated or sampled at write time (see research.md).

### Offer.titleRaw (read-only here)

The store's own listing title, owned by [[005-scraping-ingest]]/[[001-catalog-comparison]]'s
`Offer` entity. This domain reads it — **all rows, fresh and stale** — purely as search-index
text; it never displays `titleRaw` directly to a shopper (display uses the catalog `Product`
name) and never uses it to bypass the freshness gate for price display.

## Derived values (not columns)

- **Search haystack** (per product, per query): `normalizeText(nameEn + " " + nameAr + " " +
  brand.name + " " + modelNumber + " " + join(all offer titleRaw for this product))`. Computed
  fresh per search call, not cached/indexed.
- **Query tokens**: `searchTokens(query)` — `normalizeText` then split on non-letter/non-digit
  runs. A product matches only if every token is a substring of the haystack.
- **Spec facets** (`getSpecFacets`): distinct `ram_gb`/`storage_gb` values across a category's
  variants, plausibility-bounded (`ram_gb <= 24`, `storage_gb >= 32`) purely to keep obviously
  mis-parsed values out of the filter chip list — filtering itself still accepts any stored
  value.

## State transitions

None owned by this domain.
