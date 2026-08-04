# Feature Specification: Editorial Cleanup of Auto-Created Product Names

**Feature Branch**: `013-name-cleanup`

**Created**: 2026-08-04

**Status**: Draft

**Input**: "Editorial cleanup of auto-created product names: admin tool to review and fix products whose nameEn equals nameAr (raw scraped titles), suggesting cleaned bilingual names, so the catalog reads properly in both languages."

## Clarifications

### Session 2026-08-04

- **What counts as "needs cleanup"**: A product whose **English name contains Arabic
  characters** — this is exactly what `autoCreateProduct` produces (it sets `nameEn = nameAr =`
  the scraped base title, which for Dream2000/B.TECH is Arabic). This is precise: a product
  legitimately named in Latin (e.g. "iPhone 16") is not flagged even if `nameEn == nameAr`.
- **No extra persistence needed**: once an admin gives the product a Latin English name, it no
  longer matches the flag and drops off the list automatically — no separate "dismissed" state.
- **Admin UI language**: English-only, consistent with the other admin catalog tools.
- **Scope**: read + edit names/slug only; reuses the existing `updateProduct`. No scraper,
  matching, or public-UI changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fix catalog entries showing Arabic in the English name (Priority: P1)

The site owner opens an admin view that lists every product whose English name is still raw
Arabic (from auto-creation), fixes the English (and refines the Arabic) inline, and the entry
leaves the list once cleaned.

**Why this priority**: Auto-created products display Arabic text in English mode, which looks
broken to English users and hurts SEO/AdSense quality. This is the whole feature.

**Independent Test**: With at least one auto-created product present, open the view, confirm it
is listed, save a proper English name, and confirm it disappears from the list on reload and
now shows the new name on its product page.

**Acceptance Scenarios**:

1. **Given** an auto-created product with an Arabic `nameEn`, **When** the admin opens the
   cleanup view, **Then** the product is listed with its current names, image, brand, and offer
   count, most-recently-created first.
2. **Given** a listed product, **When** the admin edits the English (and optionally Arabic)
   name and slug and saves, **Then** the change persists and the row no longer appears once the
   English name has no Arabic characters.
3. **Given** a product already named properly in English, **Then** it never appears in this view.
4. **Given** a non-admin or anonymous visitor, **When** they request the view, **Then** access
   is denied (admin gate), same as all other admin pages.

### Edge Cases

- A name mixing Arabic and Latin (e.g. "iPhone ١٦") still flags until the Arabic is removed.
- Saving an English name that is empty is rejected (existing `updateProduct` trims; empty must
  not overwrite to blank) — keep current field-required behavior.
- Slug collisions are the admin's responsibility (same as the existing catalog editor).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an admin-only page listing products whose English name
  contains Arabic characters, showing id, image, brand, offer/variant counts, and both names.
- **FR-002**: The admin MUST be able to edit `nameEn`, `nameAr`, and `slug` inline and save,
  reusing the existing product-update logic.
- **FR-003**: A product MUST leave the list automatically once its English name no longer
  contains Arabic characters (no separate dismissal state).
- **FR-004**: The page MUST be reachable via a link from the existing catalog admin page and
  MUST be gated to admins.
- **FR-005**: The feature MUST NOT change scraping, matching, ingest, or any public UI.

### Key Entities

- **Product** (existing): only `nameEn`, `nameAr`, `slug` are edited; the flag is derived from
  `nameEn` containing any character in the Arabic Unicode block.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The owner can find and fix an untranslated product name in under 30 seconds from
  opening the view.
- **SC-002**: After fixing, the product shows a proper English name on its public page in
  English mode and is gone from the cleanup list.
- **SC-003**: The list count strictly decreases as names are fixed and never surfaces
  already-Latin names.

## Assumptions

- Admin UI stays English-only (existing convention); the tool edits the bilingual DB fields.
- Catalog size (hundreds of products) is small enough to filter candidates in application code.
- "Arabic characters" = the Unicode range U+0600–U+06FF (plus common presentation forms if
  present); sufficient to catch scraped Arabic titles.
