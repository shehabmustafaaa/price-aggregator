# Feature Specification: Catalog & Price Comparison

**Feature Branch**: `001-catalog-comparison`

**Created**: 2026-07-22

**Status**: Baseline — describes behavior already built and live at https://shehabw1.space.
Verified against the running product and current codebase (`web/src/lib/catalog/`,
`web/prisma/schema.prisma`). Discrepancies discovered later should be resolved by
`/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.

**Input**: Split from the original combined baseline spec (`001-asaar-baseline`) into one
spec per domain so each can evolve independently. This spec owns: canonical products and
storage variants, per-color best price and image galleries, the offer comparison view,
warranty/version display, outbound click tracking, and the 24h data-freshness gate that
governs everything a shopper is shown. It also carries the site-wide presentation baseline
(theme, installability, responsiveness) since product pages are the primary surface.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare prices for a phone (Priority: P1)

A shopper in Egypt wants to buy a specific mobile phone and see, in one place, what every
covered store charges for it — per storage configuration and per color — so they can buy from
the cheapest trustworthy source.

**Why this priority**: This is the product's reason to exist; every other feature supports it.

**Independent Test**: Open any product page with offers from ≥2 stores; verify offers are
listed per variant with store, price, warranty type, and an outbound link that reaches the
store's product page.

**Acceptance Scenarios**:

1. **Given** a product with offers from multiple stores, **When** the shopper opens its page,
   **Then** they see offers grouped by storage variant, ranked by price, each showing store
   name, price in EGP, warranty/version type, and stock status.
2. **Given** a product sold in multiple colors, **When** the shopper selects a color, **Then**
   the best price for that color is highlighted and matching images are shown.
3. **Given** an offer that has not been re-confirmed by scraping within 24 hours, **When** any
   visitor views the site, **Then** that offer is hidden everywhere (product pages, deals,
   search).
4. **Given** a shopper clicks "Go to store", **Then** the click is recorded (for future
   affiliate use) and the shopper lands on the store's page for that item.
5. **Given** a product currently has zero fresh offers, **When** a shopper opens its page,
   **Then** the page still renders (name, images, specs) without making any price claims.

---

### Edge Cases

- The same color named differently across languages/stores (أسود vs Black) is normalized to
  one canonical color before it ever reaches a shopper — a product's color picker never shows
  duplicate entries for the same physical color. (Normalization itself is performed during
  ingest; see [[005-scraping-ingest]].)
- A product with zero fresh offers still renders (name, images, specs) without price claims,
  rather than disappearing or erroring.
- An offer that has never been re-seen within the last 24 hours is invisible on every public
  surface, with no exception for "last known price" fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST group offers under canonical products and their storage-based
  variants, with per-color best prices and image galleries.
- **FR-002**: System MUST hide any offer not re-confirmed within 24 hours from all public
  surfaces (product pages, deals, search), via a single shared freshness gate applied
  everywhere offers are queried — never an unfiltered offer lookup.
- **FR-003**: Every offer MUST carry a warranty/version attribute (official local vs
  imported/grey-market) surfaced to shoppers.
- **FR-004**: System MUST record outbound clicks on store links via a redirect route (to
  enable future affiliate monetization; not active today).
- **FR-005**: A product page MUST render (name, images, specs) even when it currently has zero
  fresh offers, without displaying any price.
- **FR-006**: The site MUST default to dark theme, be installable (PWA manifest), and be
  mobile-responsive across all pages. A static About page exists; other legal pages are future
  work (see `BACKLOG.md`).

### Key Entities

- **Product**: bilingual names/descriptions, brand, category, model number, specs, images; may
  be auto-created from scraping (see [[005-scraping-ingest]]).
- **ProductVariant**: one per storage size; other attrs (RAM/network) are informational, not
  part of the variant key.
- **Offer**: a store's listing for a variant — price, URL, stock, warranty type, color attr,
  last-seen timestamp (drives the freshness gate).
- **OutboundClick**: one row per "go to store" click, linked to the offer clicked.
- **PriceHistory**: append-only price points per offer; owned by [[003-deals-and-history]] but
  populated on every ingest that touches an offer shown here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A shopper can go from landing page to a specific product's cross-store price
  comparison in under 30 seconds / 3 interactions.
- **SC-002**: 100% of publicly visible prices were confirmed by a scrape within the last 24
  hours.

## Assumptions

- Currency is EGP only; Egypt is the only market.
- Monetization (affiliate, ads) is not active; outbound click tracking exists to enable it
  later.
- No automated test suite exists yet (tracked in `BACKLOG.md`); verify catalog/offer display
  changes manually against the running site.
- This spec documents built behavior; discrepancies discovered later should be resolved by
  `/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.
