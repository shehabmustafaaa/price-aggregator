# Feature Specification: Miami Centers Store Adapter

**Feature Branch**: `016-miamicenters-adapter`

**Created**: 2026-08-05

**Status**: Draft

**Input**: Add miamicenters.com as a third scraped store so more phones have real cross-store price comparison.

## Recon (verified live 2026-08-05)

- Platform: **WooCommerce**; the public **Store API** (`/wp-json/wc/store/v1/products`) returns
  full JSON (price, images, stock, categories, brands) with no auth and no browser — same tier
  as Dream2000's Shopify API.
- Prices are whole EGP (`currency_minor_unit: 0`). Products are mostly **simple** (each
  colour/config is its own product id), not variable — one offer per product.
- Phones live under category **58 = "mobile"** (Android brands, recursive, ~365) and
  **109** (Apple/flagship umbrella, ~494 but **polluted with covers/accessories**).
- Titles embed specs: e.g. `HONOR MAGIC V5 512/16GB 5G WHITE G`, `Vivo Y500 256/6GB BLUE G`.
- Pagination via `per_page` (≤100) + `page`, with `X-WP-Total`/`X-WP-TotalPages` headers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Miami Centers offers appear in comparisons (Priority: P1)

A shopper comparing a phone Miami Centers stocks sees its price alongside Dream2000/B.TECH.

**Why this priority**: Adding a third store is the point — more products gain a real cross-store
choice, strengthening the core comparison.

**Independent Test**: Run the adapter; confirm it yields a few hundred phone offers with prices,
images, and brands, and (after ingest) they attach to matched/auto-created products.

**Acceptance Scenarios**:

1. **Given** the Store API is reachable, **When** the adapter runs, **Then** it returns phone
   offers from the Android (58) and Apple (109) trees with price (EGP), stock, brand, image, and
   parsed storage/RAM/colour attrs.
2. **Given** a product tagged as a cover/case/accessory/tablet/wearable, **Then** it is excluded
   (category-slug filter), independent of the web-side title classifier.
3. **Given** a title like `… 512/16GB 5G WHITE G`, **Then** storage=512, ram=16, and a colour are
   parsed into attrs.
4. **Given** the same product reachable from both category queries, **Then** it is ingested once.

### Edge Cases

- The Store API changes shape / a category returns nothing → that category contributes nothing;
  the run doesn't abort (per-product and per-category errors are counted, not fatal).
- A phone with no parseable storage → still ingested (storage attr omitted; variant resolves on
  what's known), matching how other adapters behave.
- Non-phone leakage (a laptop mistagged 'mobile') → the accessory-marker filter plus the
  category focus keep it out; residual noise is caught downstream in review/curation.

## Requirements *(mandatory)*

- **FR-001**: A new `miamicenters` adapter MUST implement `scrape() -> list[ScrapeResult]`,
  fetching phones from the WooCommerce Store API for the phone category trees (58, 109),
  paginated and polite (reuse the per-store request delay, backoff on 429).
- **FR-002**: The adapter MUST exclude products whose category slugs mark them as accessories
  (cover/case/accessory/wearable/tablet/watch/airpod/powerbank/charger/cable/screen/mac/ipad/
  laptop/appliance), and MUST de-duplicate by product id across category queries.
- **FR-003**: Each offer MUST carry url (permalink), title, price (EGP, whole units), stock,
  brand (from category/brand/title), image(s), and parsed storage/RAM/colour attrs where present.
- **FR-004**: The adapter MUST be registered in `main.py build_adapter` and the store seeded
  (slug `miamicenters`) so the control plane can schedule it.
- **FR-005**: A per-product or per-category failure MUST NOT abort the run (counted as parse
  errors); one broken store never blocks others (constitution IV).
- **FR-006**: No web/ingest/matching changes — the adapter feeds the existing pipeline.

## Success Criteria *(mandatory)*

- **SC-001**: One run yields ≥300 phone offers with valid prices and brands.
- **SC-002**: Zero cover/accessory products in the output (spot-checked).
- **SC-003**: Storage/RAM parsed for the large majority of offers; duplicates removed.
- **SC-004**: Ingested offers attach to products and show in comparisons like the other stores.

## Assumptions

- Miami Centers is an official local retailer → `warranty_type = OFFICIAL_LOCAL`.
- Category ids 58/109 are stable enough; if renumbered, the run degrades to fewer/no offers
  rather than wrong data, and the ids are a one-line change.
- Colour parsing is best-effort; the web `canonicalColor` maps/normalizes whatever is extracted.
