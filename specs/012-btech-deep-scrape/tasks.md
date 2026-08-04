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

- [x] **T003** Added `_discover_brand_urls(self, page, base_url)`: reads the category page's own
  facet anchors (same category path + query string), returns absolute de-duped URLs, `[]` on any
  failure. Scheme-independent so no URL pattern is hard-coded. (FR-001; live-DOM selector
  confirmed in T008.)
- [x] **T004** Rewrote `_scrape_category`: load base page once, discover brand URLs, set
  `segments = brand_urls[:MAX_SEGMENTS] or [base_url]` (FR-006 fallback).
- [x] **T005** Iterate segments via `_harvest_grid`, accumulate into a dict keyed by product
  `href` (FR-002), stop at `MAX_ITEMS` (FR-005), parse the union via unchanged `_parse_card`
  into one `ScrapeResult("mobile-phones")`.

## Phase 3 — Politeness & resilience (US2)

- [x] **T006** Each segment harvest is wrapped in try/except → `parse_errors += 1` + `continue`;
  never aborts the run (FR-004). Parse errors folded into `ScrapeResult.parse_errors`.
- [x] **T007** Sleeps `scroll_pause_s` between segment loads (FR-003); no concurrency added,
  single-daemon/claim-complete flow untouched (FR-008).

## Phase 4 — Verify & ship  *(requires Playwright/Chromium — run on dev or server)*

- [ ] **T008** Run `python main.py btech` on a Playwright-capable machine. Confirm: brand links
  are discovered (or clean fallback), unique listings ≫ 20 (target ≥100, SC-001), no duplicates
  (SC-002), run stays well under 30 min (SC-004). If the brand-facet selector matched nothing,
  fix it in T003 and re-run.
- [ ] **T009** Negative test: force one segment URL to be invalid; confirm the run still
  completes and ingests the other segments (SC-003, FR-004).
- [ ] **T010** Confirm no unintended changes: `_parse_card`, `_detect_brand`, Chromium args,
  and all `web/` code unchanged (FR-007). Update `BACKLOG.md` item (deeper B.TECH) to done.
- [ ] **T011** Commit and push. Deploy: `bash deploy.sh` on the server (scraper-only — the
  systemd daemon picks up new code; no Node Project restart needed). Watch the next scheduled
  B.TECH run's audit for coverage and no new 403/429 (SC-005).
