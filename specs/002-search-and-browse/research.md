# Phase 0 Research: Search & Browse

**Status**: Baseline — verified against `web/src/lib/catalog/search.ts`,
`web/src/lib/catalog/products.ts`, `web/src/lib/text.ts`. No `NEEDS CLARIFICATION` markers.

## Decision: In-app token matching, not a search engine

- **Decision**: `searchProducts()` loads all products (with fresh offers) plus all offer
  `titleRaw` rows, builds a normalized haystack per product (`nameEn + nameAr + brand + model +
  every offer title`), tokenizes the query, and requires every query token to appear in the
  haystack.
- **Rationale**: Constitution VII (YAGNI) — Meilisearch/Elasticsearch were deferred as
  premature infrastructure for the current catalog size; a plain in-app pass is simple,
  correct, and fast enough.
- **Alternatives considered**: Postgres full-text search (`tsvector`) was considered but
  rejected for now — it would need a generated/maintained column and doesn't trivially handle
  the custom Arabic-orthography folding this domain needs; revisit if the in-app scan becomes
  a bottleneck.

## Decision: Search index includes stale offer titles; result *display* still respects freshness

- **Decision**: The `titleRaw` rows fetched for the search haystack are **not** filtered by
  `freshOfferWhere()` — every offer any store has ever listed contributes its wording. The
  *offers actually shown* for a matched product, however, are fetched with
  `freshOfferWhere()` exactly as in [[001-catalog-comparison]].
- **Rationale**: A store's wording for a product ("جالكسي" vs "جالاكسي") is useful search
  signal independent of whether that specific listing is currently fresh — findability
  shouldn't regress just because a store hasn't been re-scraped recently. Price/availability
  trust (constitution III) is a separate concern, enforced separately.
- **Alternatives considered**: Restricting the search index to fresh-offer titles only was
  rejected — it would make products intermittently unsearchable by a store's specific wording
  as that store's offers cycle in and out of freshness, which is a worse experience for no
  data-trust benefit (searchability isn't a price claim).

## Decision: Zero-result queries are logged unconditionally

- **Decision**: Any query whose token-matching yields zero products triggers a `MissedSearch`
  insert (raw query text, trimmed, plus locale) — no rate limiting, dedup, or sampling.
- **Rationale**: This is the catalog-gap signal the solo operator uses to decide what to add
  next (FR-002); under-logging would hide real demand.
- **Alternatives considered**: Deduplicating identical queries was rejected as premature —
  frequency of a missed query is itself useful information, better computed later by
  aggregating the raw log than lost by deduping at write time.

## Decision: Category browse filters/paginates in application code (shared with 001)

- Same underlying decision as [[001-catalog-comparison]]'s research.md ("Listing pages filter/
  sort price in application code, not SQL") — `listCategoryProducts` is the same function
  family; not re-litigated here.

## Open questions

None — baseline of already-built, already-verified behavior.
