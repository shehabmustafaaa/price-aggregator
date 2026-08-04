# Implementation Plan: Deeper B.TECH Scraping

**Branch**: `012-btech-deep-scrape` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-btech-deep-scrape/spec.md`

## Summary

The B.TECH adapter today loads one grid (`/ar/c/mobiles-tablets/mobiles`), infinite-scrolls
it, and harvests cards — which caps near ~20 items. This feature makes the adapter discover
the brand-filter links present on that category page, then visit and harvest each brand's
(smaller, fully-loadable) grid, unioning and de-duplicating listings by product URL, bounded
by an overall item cap and paced by the existing per-store delay. If no brand links are found,
it falls back to today's single-grid behavior so coverage never regresses. Matching, variants,
sanity, ingest, and the web UI are untouched — only the volume of B.TECH `RawOffer`s rises.

## Technical Context

**Language/Version**: Python 3.12

**Primary Dependencies**: Playwright (sync API) + headless Chromium (already required for
B.TECH; installed via `requirements-browser.txt`, launched `--no-sandbox --disable-dev-shm-usage`
under systemd/root).

**Storage**: N/A in the scraper — offers POST to `web`'s `/api/ingest`; DB writes happen there.

**Testing**: Manual E2E — `python main.py btech` on a machine with Playwright, then verify the
run's per-URL audit at `/admin/scraper`. (Pure-logic unit tests live in `web/`; this change is
browser-I/O bound and not unit-testable without a live page.)

**Target Platform**: Linux server (systemd `asaar-scraper` daemon); dev on Windows.

**Project Type**: Scraper adapter (single file, `scraper/adapters/btech.py`).

**Performance Goals**: One full run completes within the scheduler's 30-min stale-job window at
the configured delay; ≥ ~100 (target ~5×) unique phone listings per run.

**Constraints**: Must not raise request rate vs. today; must not get the server IP blocked;
must stay a single daemon instance (unchanged).

**Scale/Scope**: ~13 known phone brands on B.TECH; overall cap ~400 unique listings/run.

## Constitution Check

*GATE: must pass before and after design.*

- **IV. Ingest is a pipeline / adapters isolated**: PASS — change is confined to one adapter
  file behind the unchanged `scrape() -> list[ScrapeResult]` interface; per-segment failures
  are caught so one bad brand never aborts the run (isolation preserved).
- **V. Scrape politely, survive blocks**: PASS — reuses the existing per-store delay between
  segment loads, adds no concurrency, keeps the single-daemon rule, and adds an item cap;
  design explicitly favors slower traversal over speed.
- **VI. Category-extensible / env-only config**: PASS — new knobs (item cap, optional brand
  allow/deny) are adapter constants/config, no host specifics, no schema change.
- **VII. Simplicity first**: PASS — no new services or dependencies; DOM-discovery of brand
  links avoids a brittle hard-coded URL scheme and needs no new infra.
- Others (I, II, III bilingual/data-trust) — N/A to a scraper adapter; downstream ingest
  already enforces them unchanged.

No violations → Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/012-btech-deep-scrape/
├── plan.md              # This file
├── spec.md              # Feature spec (with Clarifications)
├── tasks.md             # /speckit-tasks output
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
scraper/
├── adapters/
│   └── btech.py         # THE change: brand-link discovery + multi-segment harvest + dedup + cap + fallback
├── core/
│   └── models.py        # unchanged (RawOffer, ScrapeResult)
└── main.py              # unchanged (build_adapter already wires "btech")
```

**Structure Decision**: Single-file adapter change. Refactor the existing grid-harvest logic
into a reusable helper, add a brand-discovery step, and orchestrate multiple segments in
`scrape()`. No other files change.

## Investigation findings (live, 2026-08-04)

The original plan assumed brand grids are smaller and that facet *links* could be discovered.
Direct probing of live B.TECH disproved both:

- Every grid — main category, search, and per-brand — hard-caps at exactly **20** items.
- `?page=2` / `?p=2` / `?offset=20` are ignored; there is no "load more" control and no
  separate JSON product API (data is Next.js server-streamed).
- Brand facets are **unlabeled `<button>`s** (client-side JS), so there are no brand *links*
  to discover — `_discover_brand_urls` (the first attempt) found zero.
- **Key unlock**: applying a brand facet rewrites the URL to a *shareable* search URL,
  `…/ar/s?q=mobiles+tablets+mobiles&filters={"brands":["<slug>"]}` (slug = English lowercase).
  Constructing that URL per brand and unioning yields ~200+ phones (verified: 218).

## Design Detail (as implemented)

**`_brand_url(slug)`** builds the brand-filtered search URL (URL-encoded `filters` JSON).

**`_harvest_grid(page, url) -> list[dict]`** — goto + wait + scroll + evaluate the card array
(the original single-grid logic, unchanged).

**`_scrape_category`** iterates `BRAND_SLUGS` (apple, samsung, xiaomi, redmi, oppo, realme,
honor, infinix, vivo, nokia, tecno, huawei, oneplus → canonical labels):
- For each brand: `_harvest_grid(_brand_url(slug))`, wrapped in try/except → `parse_errors += 1`
  + `continue` (FR-004). Sleep the per-store delay between brands (FR-003).
- Union cards into a dict keyed by product **path** (`href.split("?")[0]`, dropping the
  per-offer `offering_id`) to de-dup across brands (FR-002); stop at `MAX_ITEMS` = 400 (FR-005).
- If the union is empty (e.g. B.TECH changed the filter scheme), fall back to the unfiltered
  `SEARCH_BASE` grid — the original ~20 (FR-006).
- Parse the union via the unchanged `_parse_card`.

**Unchanged**: `_parse_card`, `_detect_brand`, regexes, Chromium launch args, `RawOffer`
shape, `main.py` wiring, all ingest/matching/web code (FR-007).

## Risks & Mitigations

- *B.TECH changes the `filters` URL scheme* → per-brand grids return nothing → empty union →
  automatic fallback to the unfiltered grid; no regression below today's ~20.
- *A brand B.TECH doesn't stock* (e.g. OnePlus) → its grid is empty/degenerate → caught,
  counted as a parse error, run continues (observed live: OnePlus returned 1 non-phone item).
- *Full sweep triggers an IP block* → item cap + existing per-store delay bound the traffic;
  lower the cap or raise the delay from `/admin/scraper` with no code change.
- *Per-brand 20-cap still truncates very large brands* (Samsung/Xiaomi have >20 models) →
  accepted for v1; a future refinement could add a second facet (e.g. price bands) per brand.

## Complexity Tracking

No constitution violations — not applicable.
