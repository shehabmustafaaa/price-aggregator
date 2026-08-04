# Tasks: Deeper B.TECH Scraping

**Feature**: `012-btech-deep-scrape` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

All changes are confined to `scraper/adapters/btech.py` unless noted. Verification requires
Playwright/Chromium (dev machine with `requirements-browser.txt`, or the server).

## Phase 1 — Refactor (no behavior change)

- [x] **T001** Extracted the grid logic into `_harvest_grid(self, page, url) -> list[dict]`
  (goto + wait + infinite-scroll + card-array harvest), behavior identical to before.
- [x] **T002** Added `MAX_ITEMS = 400` and `MAX_SEGMENTS = 25`; inter-segment gap reuses the
  existing `scroll_pause_s` (from `request_delay_s`).

## Phase 2 — Brand-segment traversal (US1)

> Live investigation (see plan.md) changed the mechanism: brand facets are client-side buttons
> with no discoverable links, but applying one yields a shareable `…&filters={"brands":["slug"]}`
> search URL. So we construct brand-filter URLs directly instead of discovering links.

- [x] **T003** Added `BRAND_SLUGS` (English facet slug → canonical label) and `_brand_url(slug)`
  which builds the URL-encoded `filters` search URL. Replaces the dead `_discover_brand_urls`.
  (FR-001)
- [x] **T004** Rewrote `_scrape_category` to iterate `BRAND_SLUGS`, harvesting each brand's grid;
  empty union falls back to the unfiltered `SEARCH_BASE` (FR-006).
- [x] **T005** Union cards into a dict keyed by product **path** (drops `offering_id`) to de-dup
  across brands (FR-002), stop at `MAX_ITEMS` (FR-005), parse via unchanged `_parse_card` into
  one `ScrapeResult("mobile-phones")`.

## Phase 3 — Politeness & resilience (US2)

- [x] **T006** Each segment harvest is wrapped in try/except → `parse_errors += 1` + `continue`;
  never aborts the run (FR-004). Parse errors folded into `ScrapeResult.parse_errors`.
- [x] **T007** Sleeps `scroll_pause_s` between segment loads (FR-003); no concurrency added,
  single-daemon/claim-complete flow untouched (FR-008).

## Phase 4 — Verify & ship  *(requires Playwright/Chromium — run on dev or server)*

- [x] **T008** Ran the adapter live on the dev machine: **218 unique offers** across 12 brands
  (vs. 20 before) — far past the ≥100 target (SC-001, ~11×), de-duped (SC-002), completed in a
  few minutes well under the 30-min window (SC-004).
- [x] **T009** Resilience confirmed in the same run: the OnePlus brand grid was empty/degenerate
  → caught, `parse_errors=1`, run continued and returned all other brands (SC-003, FR-004).
  Empty-union fallback to the unfiltered grid is coded (FR-006).
- [x] **T010** No unintended changes: `_parse_card`, `_detect_brand`, regexes, Chromium args,
  and all `web/` code unchanged (FR-007). `BACKLOG.md` item #7 marked done.
- [ ] **T011** (owner) Deploy: `git pull` is already on master; on the server run
  `bash deploy.sh` (scraper-only — the systemd daemon picks up new code; no Node Project restart
  needed). Watch the next scheduled B.TECH run's audit for ~200 offers and no new 403/429 (SC-005).
