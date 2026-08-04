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

## Design Detail

**Refactor**: Split `_scrape_category` into:
1. `_harvest_grid(page, url) -> list[dict]` — goto + wait + infinite-scroll + evaluate the card
   array (today's logic, unchanged), returning raw card dicts.
2. `_discover_brand_urls(page) -> list[str]` — on the base category page, read anchors in the
   brand facet (e.g. links whose href points back into the mobiles category with a brand
   filter param/segment). Return absolute URLs. Best-effort; `[]` if none found.

**Orchestrate** in `scrape()`:
- Load base category page once; `brand_urls = _discover_brand_urls(page)`.
- Segments = `brand_urls` if non-empty, else `[base_category_url]` (fallback, FR-006).
- For each segment: `_harvest_grid`, catch exceptions → `parse_errors += 1`, `continue`
  (FR-004). Sleep the per-store delay between segments (FR-003).
- Accumulate cards into a dict keyed by product URL to de-dup (FR-002); stop adding once the
  ~400 cap is reached (FR-005).
- Parse the unioned cards with the existing `_parse_card` (unchanged) into one `ScrapeResult`
  for `mobile-phones`.

**Unchanged**: `_parse_card`, `_detect_brand`, regexes, Chromium launch args, `RawOffer`
shape, `main.py` wiring, all ingest/matching/web code.

## Risks & Mitigations

- *Brand facet selector guess is wrong* → discovery returns `[]` → automatic fallback to
  today's behavior; no regression. Selector is verified during implement against the live DOM.
- *Full sweep triggers an IP block* → item cap + existing delay bound the traffic; can lower
  the cap or raise the delay per-store from `/admin/scraper` without code change.
- *Run exceeds 30-min window* → item cap keeps it bounded; if still long, reduce cap.

## Complexity Tracking

No constitution violations — not applicable.
