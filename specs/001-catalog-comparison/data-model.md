# Phase 1 Data Model: Catalog & Price Comparison

**Status**: Baseline — reflects `web/prisma/schema.prisma` as built. This domain does not own
schema changes to these tables; it documents the shape it reads/writes so future changes here
know what they'd be touching. Full field lists live in the schema itself; this file adds the
relationships, invariants, and derived values that aren't obvious from column names alone.

## Entities in scope

### Product

Canonical catalog entry a shopper compares. Bilingual name/description, `slug` (route key),
optional `brandId`, `categoryId`, `modelNumber`, `specs` (jsonb), `images` (string array).

- Owned here for *display*; may be created by [[005-scraping-ingest]]'s auto-create path or
  edited/merged by [[006-admin-operations]] — this domain only reads it.
- **Invariant**: a `Product` with zero fresh offers across all its variants still renders
  (name/images/specs) — the page must not require `bestPrice() != null` to exist.

### ProductVariant

One row per storage configuration of a `Product`. `attrs` (jsonb) carries storage_gb plus any
informational attrs (ram_gb, network) a store happened to report.

- **Invariant**: variant identity is storage-only (see research.md); this domain must never
  group/split variants by any other `attrs` key.
- Relationship: `Product 1 — N ProductVariant`.

### Offer

A single store's listing for a variant. Fields relevant to this domain: `price` (Decimal
12,2), `currency` (always "EGP" today), `inStock`, `warrantyType` (`OFFICIAL_LOCAL` |
`IMPORTED` | `UNKNOWN`), `attrs.color` (canonical key), `url` (outbound destination),
`lastSeenAt` (the freshness clock).

- **Invariant**: any `Offer` surfaced to a shopper (product page, category listing, similar
  products) MUST have passed `freshOfferWhere()` — `lastSeenAt >= now - 24h` AND
  `store.active`. The one exception is the outbound-click redirect, which resolves by id with
  no freshness filter (see research.md).
- Relationship: `ProductVariant 1 — N Offer`, `Store 1 — N Offer`.

### OutboundClick

Append-only click log: `offerId`, `clickedAt`, `referer`, `locale`. Written by
`recordOutboundClick()` on every `/go/[offerId]` hit, regardless of the offer's freshness.

- **Invariant**: a click is recorded even if the offer has since gone stale between being
  rendered and being clicked — click volume must reflect real user action, not be filtered
  after the fact.

### Store (fields relevant to this domain only)

`name`, `domain`, `logoUrl`, `active` — rendered alongside each offer. Scrape-scheduling
fields (`scrapeEnabled`, `scrapeIntervalMinutes`, `requestDelaySeconds`) belong to
[[005-scraping-ingest]] and [[006-admin-operations]]; this domain only reads the display
fields plus `active` (which participates in `freshOfferWhere()`).

## Derived values (not columns)

- **`bestPrice(product)`**: `min(price)` across all of a product's *currently fresh* offers
  (all variants combined), or `null` if none. Never computed over stale offers — it's a pure
  function over whatever the caller already fetched through `freshOfferWhere()`, so correctness
  depends on the caller having used that gate.
- **Canonical color grouping**: offers grouped by `attrs.color` (already a canonical key by
  the time this domain sees it); the "best price for this color" shown on color selection is
  `min(price)` over fresh offers whose variant belongs to the product and whose `attrs.color`
  matches the selected key.

## State transitions

None owned by this domain — `Offer.lastSeenAt` transitions (fresh → stale) happen purely by
the passage of time relative to ingest activity owned by [[005-scraping-ingest]]; this domain
only reads the current state at request time, it does not mutate offer freshness.
