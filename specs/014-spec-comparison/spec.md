# Feature Specification: Side-by-Side Spec Comparison

**Feature Branch**: `014-spec-comparison`

**Created**: 2026-08-05

**Status**: Draft

**Input**: "Side-by-side spec comparison: let shoppers select 2 to 4 phones and view their specifications in a comparison table with per-row highlighting of differences, bilingual/RTL, linking back to each product's offers. Reuse the existing product specs data."

## Clarifications

### Session 2026-08-05

- **Selection mechanism**: device-only, no account — a small localStorage set (mirrors the
  recently-viewed pattern, spec 010). A compare toggle on each product card adds/removes it; a
  floating "compare tray" shows the current selection and links to the compare page. Cap 4.
- **Compare page addressing**: `/compare?p=slug1,slug2,…` — shareable/bookmarkable; the page
  is server-rendered from the slugs, independent of localStorage so a shared link works.
- **Row set**: the union of each phone's feature rows from the existing `buildFeatures` (declared
  specs + derived storage/RAM/network/colours), plus a best-price row. Rows keep first-seen order.
- **Highlighting**: a row whose values are not all identical is marked as "differs"; the
  best-price cell (lowest) is highlighted. No numeric "winner per spec" beyond price in v1.
- **Bilingual/RTL**: labels/values use the existing localized feature builder; table is RTL-safe.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare 2–4 phones side by side (Priority: P1)

A shopper researching phones picks a few, opens a comparison table, and sees their specs aligned
in columns with differences highlighted and the cheapest one obvious — so they can decide.

**Why this priority**: This is the differentiator; neither competitor does spec comparison well.

**Independent Test**: Open `/compare?p=<slugA>,<slugB>` for two real products and confirm a table
renders with aligned spec rows, differing rows highlighted, a best-price row, and links back to
each product.

**Acceptance Scenarios**:

1. **Given** 2–4 valid product slugs in `?p=`, **When** the compare page loads, **Then** each is
   a column showing image, name, best price, and store count, with spec rows aligned by label.
2. **Given** a spec both phones share with different values, **Then** that row is visually marked
   as differing; **Given** identical values, the row is not marked.
3. **Given** the phones have different best prices, **Then** the lowest price cell is highlighted.
4. **Given** a phone lacks a spec another has, **Then** its cell shows a placeholder ("—").
5. **Given** each column, **When** the shopper clicks it, **Then** they reach that product's page.

### User Story 2 - Build the selection while browsing (Priority: P2)

While browsing category/search/product pages, the shopper toggles phones into a compare set that
persists on their device, sees a running tray, and opens the comparison when ready.

**Why this priority**: Makes the feature reachable during normal browsing; the compare page alone
(US1) is still usable via direct link, so this is P2.

**Independent Test**: Toggle compare on two product cards; confirm the tray shows 2 and its
"Compare" button opens `/compare?p=…` with those slugs; reload and confirm the set persists.

**Acceptance Scenarios**:

1. **Given** a product card, **When** the shopper toggles compare, **Then** it is added to the
   device set and the tray count updates immediately.
2. **Given** the set has 2–4 items, **Then** the tray shows a "Compare" action linking to the
   compare page with those slugs; **Given** fewer than 2, the tray hides the action (or hides).
3. **Given** the set is at the cap (4), **When** the shopper toggles a 5th, **Then** it is not
   added and the UI indicates the limit.
4. **Given** a reload or navigation, **Then** the set persists (localStorage); clearing it empties
   the tray.

### Edge Cases

- `?p=` with 0/1 slugs, unknown slugs, or >4 → show a friendly prompt / ignore extras / cap at 4.
- Duplicate slugs in `?p=` → de-duplicated.
- localStorage unavailable (private mode) → toggles/tray degrade to no-op without crashing.
- A product with no fresh offers → shows "no offers" instead of a price; still comparable on specs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render a comparison page at `/compare?p=<comma-separated slugs>`
  for 2–4 products, server-rendered from the slugs (independent of device state).
- **FR-002**: The page MUST show, per product column: image, localized name (linked to the
  product), best fresh price (or a no-offers state), and store count.
- **FR-003**: The page MUST align spec rows by label using the existing feature builder, showing
  a placeholder for missing values, and MUST mark rows whose values are not all identical.
- **FR-004**: The page MUST highlight the lowest best-price cell.
- **FR-005**: The system MUST let shoppers toggle products into a device-only compare set
  (localStorage, cap 4) from product cards, with no account and no server writes.
- **FR-006**: A tray MUST reflect the current set live and link to the compare page for the
  selected slugs when the set has ≥2 items; it MUST allow clearing the set.
- **FR-007**: All UI MUST be bilingual (AR default/EN) and RTL-safe.
- **FR-008**: The feature MUST NOT change scraping, ingest, matching, or the offer/data model.

### Key Entities

- **Compare set** (client-only): an ordered, capped list of product slugs (+ cached name/image
  for the tray), in localStorage.
- **Comparison** (server-derived): columns = selected products; rows = union of feature labels +
  a price row, each row carrying per-column values and a "differs" flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A shopper can select two phones and reach a rendered comparison in under 20 seconds.
- **SC-002**: The comparison highlights every differing spec row and the cheapest phone with no
  false "differs" on identical rows.
- **SC-003**: A shared `/compare?p=…` link reproduces the same comparison for another visitor
  with no prior state.
- **SC-004**: The compare set survives reloads and never exceeds 4 items.

## Assumptions

- Comparison covers phones only (the only category with offers today); the feature is
  category-agnostic in code but exercised on phones.
- Spec data comes from the existing `buildFeatures` output; no new spec fields are introduced.
- "Best price" reuses the existing fresh-offer logic and the 24h freshness gate.
