# Phase 0 Research: Catalog & Price Comparison

**Status**: Baseline — this records decisions already made and implemented, verified against
`web/src/lib/catalog/`, `web/src/lib/tracking/clicks.ts`, and `web/prisma/schema.prisma`. No
`NEEDS CLARIFICATION` markers remain; every item below was resolved by reading the running
code, not by assumption.

## Decision: Freshness enforced by a single shared query helper, not per-call filtering

- **Decision**: All public reads of `Offer` rows call `freshOfferWhere()`
  (`web/src/lib/catalog/offers.ts`), which returns `{ lastSeenAt: { gte: now - 24h },
  store: { active: true } }`, spread into every Prisma `where` clause that lists offers.
- **Rationale**: Constitution III requires the staleness rule to live in exactly one place, so
  it can't drift between the product page, category browse, deals, and search. A shared helper
  makes the rule impossible to forget when a new read path is added.
- **Alternatives considered**: A database view or generated column encoding freshness was
  rejected — it would require a migration per threshold change and doesn't compose with
  Prisma's query builder as cleanly as a spread-able `where` fragment.

## Decision: The outbound-click redirect intentionally bypasses the freshness gate

- **Decision**: `getOfferForRedirect()` reads the offer by id with no freshness filter; only
  `getVisibleOffersForProduct`/`getProductBySlug`/etc. (the *listing* paths) apply
  `freshOfferWhere()`.
- **Rationale**: By the time a shopper clicks "Go to store", the offer was already rendered to
  them (possibly seconds ago, possibly from a cached page); refusing the redirect because the
  offer just crossed the 24h boundary would 404 a link the user is actively acting on. The
  click still gets recorded either way.
- **Alternatives considered**: Applying the same gate to redirects too was rejected as a worse
  experience for no data-trust benefit — the shopper isn't being shown a *new* stale price,
  they're following through on one they already saw.

## Decision: Storage is the only variant key; RAM/network stay informational

- **Decision**: `ProductVariant.attrs` is a free-form jsonb bag, but variant identity/grouping
  is storage-only (constitution VI, `lib/ingest/variant.ts` — [[005-scraping-ingest]]). This
  domain's `bestPrice()`/color grouping operate per-variant, so they inherit that storage-only
  key without re-deriving it.
- **Rationale**: Store listings inconsistently mention RAM/network in titles; keying variants
  on storage alone (the one attribute nearly every store states) keeps matching reliable
  without fragmenting otherwise-identical offers into near-duplicate variants.
- **Alternatives considered**: A composite storage+RAM key was rejected because it would
  silently split offers into separate rows whenever a store omitted RAM from a title —
  exactly the fragility the edge case in the spec calls out.

## Decision: Color normalization happens once, at ingest; this domain only renders labels

- **Decision**: `canonicalColor()` (alias/orthography matching) runs in the ingest pipeline
  ([[005-scraping-ingest]]) before an offer is ever stored; `colorLabel(key, locale)` in this
  domain is a pure lookup with no matching logic.
- **Rationale**: Keeping normalization in one direction (ingest → canonical key → display
  label) avoids two independent places that could disagree about whether "روز" and "Rose" are
  the same color.
- **Alternatives considered**: Normalizing at render time (raw string → label) per request was
  rejected — it would need to run the same alias-matching logic on every page view instead of
  once per offer at ingest, and would leave the color *grouping* (which colors count as "the
  same" for the picker) inconsistent between requests if the alias table ever changed.

## Decision: Listing pages filter/sort price in application code, not SQL

- **Decision**: `listCategoryProducts`/`listLatestProducts` fetch a bounded set (`take: 2000`)
  of products with their fresh offers included, then compute `bestPrice()` and filter/sort in
  JS.
- **Rationale**: Price is derived (minimum of a product's fresh offers), not a column, so it
  can't be ordered or range-filtered at the DB level without a materialized/denormalized price
  field. At current catalog scale (single category, two active stores) an in-memory pass over
  ≤2000 rows is simple and fast enough; constitution VII (YAGNI) explicitly favors this over
  adding a search/cache service.
- **Alternatives considered**: A materialized "best price" column updated on every offer
  upsert was rejected as premature — it adds a consistency-maintenance burden with no current
  performance problem to justify it. Revisit if/when catalog size makes the `take: 2000` scan
  a real bottleneck.

## Open questions

None — this is a baseline of already-built, already-verified behavior.
