# Tasks: Second Category — Home Appliances

**Feature**: `017-home-appliances` | **Spec**: [spec.md](./spec.md)

- [x] **T001** Audit the codebase for phone-only assumptions. Found: variant keyed on
  `storage_gb` (collapses to one variant for appliances — correct), deals grouped by storage
  (degrades), feature derivation (degrades), accessory filter already gated by `isPhones`.
  Category page facets already self-hide when empty → **no web changes needed** (FR-006).
- [x] **T002** Recon Miami Centers appliance tree: category **1639** (~317 curated products);
  brands via `brands` field or title's leading word.
- [x] **T003** `scraper/adapters/miamicenters.py`: replace `PHONE_CATEGORY_IDS` with
  `CATEGORY_GROUPS` (ids + canonical slug + kind); `scrape()` emits one `ScrapeResult` per group
  with per-group dedupe. (FR-002)
- [x] **T004** Per-kind parsing: `_parse_product(product, kind)` — storage/RAM/colour for phones
  only; rename `_is_accessory` → `_is_phone_excluded` and apply it only to the phone kind.
  (FR-003, FR-004)
- [x] **T005** Brand detection extended: known phone brands → WooCommerce `brands` field →
  title's leading word (appliance fallback). (FR-003)
- [x] **T006** Taxonomy: `home-appliances` category in `web/prisma/seed.ts` + mapping for Miami
  Centers; `scripts/add-miamicenters.ts` extended to upsert the category and map both
  categories for the existing prod DB. (FR-001, FR-005)
- [x] **T007** Live dry-run verified: **433 phones + 317 appliances, 0 parse errors**; appliance
  brands (Smeg/Arzum/Braun/DeLonghi/Philips/Kenwood) detected; appliance attrs empty. (SC-001)
- [x] **T008** Added 2 integration tests (one-variant-per-appliance; accessory filter must not
  fire outside phones). `tsc --noEmit` clean; suite collects 16 tests.
- [ ] **T009** (blocked) Execute the DB tests — local Postgres service is stopped and starting it
  needs elevation. Run `net start postgresql-x64-17` (admin), then `npm run test:integration`.
  Closes SC-002/SC-003.
- [ ] **T010** (owner) Deploy: `bash deploy.sh`; then `cd web && npx tsx scripts/add-miamicenters.ts`
  (creates the appliances category + mappings). Watch `/admin/scraper` for a Miami run producing
  **two** ingest results, then check `/c/home-appliances` renders. Closes SC-004.
