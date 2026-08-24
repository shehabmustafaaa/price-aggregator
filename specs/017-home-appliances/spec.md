# Feature Specification: Second Category — Home Appliances

**Feature Branch**: `017-home-appliances`

**Created**: 2026-08-24

**Status**: Code complete; DB-backed verification pending (see Verification)

**Input**: "Add a second product category (home appliances) end-to-end: taxonomy, adapter
category mapping, and confirm the catalog/filters/compare work generically."

## Why

The schema and code were designed "category-extensible from day one" (constitution VI), but
only ever exercised with phones. This feature proves that claim by adding a real second
category — and it is cheap because Miami Centers (spec 016) already sells appliances through
the same WooCommerce Store API we scrape.

## Investigation findings (live, 2026-08-24)

- Miami Centers category **1639 = `home-appliances`** is a clean, curated tree (~317 products:
  mixers, air-fryers, heaters, irons, kettles, vacuums, some TVs/cameras).
- Appliance brands come from the WooCommerce `brands` field, else the title's leading word
  ("Braun Hand Blender…", "Kenwood Airfryer…") — Smeg, Arzum, Braun, DeLonghi, Philips, Kenwood.
- **Critical interaction**: the phone adapter's exclusion list contains `airfryer`, `iron`,
  `mixer`, `scooter` (used to keep non-phones out of the phone scrape). Applied to the appliance
  tree it would delete exactly the products we want — so exclusion must be phone-only.
- Web UI needs **no changes**: the home page lists categories dynamically via `listCategories()`,
  and the category page's storage/RAM facet blocks already self-hide when a category has no such
  values (`facets.storageGb.length > 0`), leaving working brand + price + sort filters.

## Requirements *(mandatory)*

- **FR-001**: A `home-appliances` category MUST exist (bilingual: Home Appliances / الأجهزة
  المنزلية), created by `seed.ts` for fresh setups and by an idempotent script for the live DB.
- **FR-002**: The Miami Centers adapter MUST scrape configured **category groups**, emitting one
  `ScrapeResult` per canonical category — phones (58, 91) and appliances (1639).
- **FR-003**: Parsing MUST be per-kind: phones parse storage/RAM/colour; appliances parse brand
  only and carry no variant attrs (each appliance model = one comparable variant).
- **FR-004**: The phone exclusion filter MUST apply ONLY to the phone kind (FR-003 rationale
  above), so appliances are never dropped by markers like `airfryer`.
- **FR-005**: The store MUST be mapped to both categories (`category_stores`).
- **FR-006**: No changes to the ingest pipeline, matching, variant resolution, or web UI — the
  existing code must handle the new category generically. (If it doesn't, that's the bug.)

## Success Criteria *(mandatory)*

- **SC-001**: One adapter run yields both categories with sane data. **Verified live: 433 phones
  + 317 appliances, 0 parse errors**, appliance brands correctly detected, appliance attrs empty.
- **SC-002**: Ingested appliances create one product with exactly one variant each. *(Covered by
  a new integration test; execution pending — see Verification.)*
- **SC-003**: The phone accessory filter does not fire outside the phones category. *(Same.)*
- **SC-004**: The appliances category page renders with brand/price filters and no empty
  storage/RAM facets, and appears on the home page automatically once it has products.

## Verification status

- **Done**: live adapter dry-run (SC-001); `tsc --noEmit` clean; integration suite *collects*
  16 tests (14 existing + 2 new appliance tests).
- **Pending**: the local PostgreSQL service (`postgresql-x64-17`) is stopped and starting it
  needs elevation, so the DB-backed tests could not be executed this session. Run
  `net start postgresql-x64-17` (as admin) then `npm run test:integration` to close SC-002/003.
- **Pending**: SC-004 is a visual check after deploy + first appliance scrape.

## Assumptions

- Appliances have no per-category spec definitions yet (no facet chips beyond brand/price).
  Adding e.g. capacity/wattage later is inserting `spec_definitions` rows — no code change.
- Some noise (a TV or camera inside the appliance tree) is acceptable and handled by the
  existing catalog-curation admin tools rather than more scraper heuristics.
