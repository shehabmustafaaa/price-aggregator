# Tasks: Miami Centers Store Adapter

**Feature**: `016-miamicenters-adapter` | **Spec**: [spec.md](./spec.md)

- [x] **T001** Recon: confirmed WooCommerce Store API (public JSON), fields, pagination, and the
  phone category trees (58 = Android, 91 = iPhone; 109 is all covers → excluded).
- [x] **T002** `scraper/adapters/miamicenters.py`: `MiamiCentersAdapter.scrape()` — paginate the
  Store API for categories 58 & 91, per-store delay + 429 backoff, dedupe by product id,
  accessory-slug filter, map to `RawOffer` (price EGP whole units, images, stock, brand from
  category/title, storage/RAM from `256/6GB`, iPhone single-storage `512GB`/`1TB`, colour). (FR-001,2,3,5)
- [x] **T003** Register `miamicenters` in `scraper/main.py build_adapter`. (FR-004)
- [x] **T004** Seed the store: added to `web/prisma/seed.ts` (fresh setups) + one-off idempotent
  `web/scripts/add-miamicenters.ts` for the existing prod DB. (FR-004)
- [x] **T005** Verified live: dry-run scrape → **426 offers, 0 parse errors**, brands
  Samsung/Xiaomi/Apple/Honor/Vivo/Oppo/Motorola/Nothing/Huawei/Tecno, storage parsed 421/426,
  colour 408, **zero accessory leaks** (SC-001,2,3). E2E: sample Android+iPhone offers through
  the real `ingest` pipeline → products+offers created (SC-004).
- [ ] **T006** (owner) Deploy: push; on the server `bash deploy.sh`, then
  `cd web && npx tsx scripts/add-miamicenters.ts` (inserts the store), then the daemon schedules
  it automatically. Watch `/admin/scraper` for the first Miami Centers run (~400 offers, no errors).
