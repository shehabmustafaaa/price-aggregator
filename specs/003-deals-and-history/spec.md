# Feature Specification: Deals & Price History

**Feature Branch**: `003-deals-and-history`

**Created**: 2026-07-22

**Status**: Baseline — describes behavior already built and live at https://shehabw1.space.
Verified against the running product and current codebase (`web/src/lib/catalog/deals.ts`,
`PriceHistory` model in `web/prisma/schema.prisma`). Discrepancies discovered later should be
resolved by `/speckit-converge` or a follow-up feature spec, not by silently editing this
baseline.

**Input**: Split from the original combined baseline spec (`001-asaar-baseline`) into one
spec per domain so each can evolve independently. This spec owns: the deals surfaces
(cross-store spread, price drops, plausibility cap) and per-product price-history charts. It
depends on [[001-catalog-comparison]]'s freshness gate — every figure shown here is computed
only from currently-fresh offers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover deals and price history (Priority: P2)

A shopper browses "deals" surfaces: biggest cross-store price spreads and recent price drops,
and on each product a 90-day price-history chart to judge whether now is a good time to buy.

**Why this priority**: Differentiator and retention driver; builds trust in the data.

**Independent Test**: Open the deals page; verify each entry's spread/drop is computed from
currently fresh offers and no entry shows an implausible discount (>45% spread).

**Acceptance Scenarios**:

1. **Given** fresh offers across stores, **When** the shopper opens the deals page, **Then**
   they see products ranked by cross-store savings, capped at plausible spreads.
2. **Given** a product whose price dropped versus its 30-day high, **Then** it appears in
   price drops with the old and new price.
3. **Given** a product with ≥2 days of history, **Then** its page shows a daily lowest-price
   chart for up to 90 days.

---

### Edge Cases

- A product has fewer than 2 days of recorded history — its price-history chart has
  insufficient data to be meaningful and is handled accordingly (not shown, or shown with an
  explicit "not enough history yet" state) rather than rendering a misleading single-point
  chart.
- A cross-store spread would exceed the 45% plausibility cap (e.g. due to a matching error) —
  it is excluded from deals surfaces rather than shown as a "too good to be true" discount.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide deals surfaces (cross-store spread, recent price drops),
  computed only from currently-fresh offers (per [[001-catalog-comparison]]'s freshness gate),
  with a 45% plausibility cap on any spread/discount shown.
- **FR-002**: System MUST record a price-history point on every ingest that touches an offer,
  and render a 90-day daily-lowest-price chart per product once sufficient history exists
  (≥2 days).

### Key Entities

- **PriceHistory**: append-only price point per offer (price, shipping cost, stock, recorded
  timestamp); the raw series that deals and charts are computed from.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero implausible deals (>45% spread) appear on deal surfaces.

## Assumptions

- Deals correctness is entirely downstream of offer freshness and ingest price-sanity
  ([[001-catalog-comparison]], [[005-scraping-ingest]]); this spec does not re-implement those
  guarantees, only consumes them.
- No automated test suite exists yet (tracked in `BACKLOG.md`); verify deals/history changes
  manually against the running site.
- This spec documents built behavior; discrepancies discovered later should be resolved by
  `/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.
