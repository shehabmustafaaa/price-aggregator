# Feature Specification: Deeper B.TECH Scraping

**Feature Branch**: `012-btech-deep-scrape`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Deeper B.TECH scraping: currently the B.TECH adapter only captures the top ~20 phones because the category grid caps there with no pagination. Expand coverage by iterating over brand filters (and/or subcategories) so we ingest the full phone catalog, while keeping the existing politeness delays, backoff, and single-daemon rules. No change to matching or the web UI."

## Clarifications

### Session 2026-08-04

- **Traversal strategy**: Discover brand-filter links from the category page's own DOM (the
  brand facet/sidebar), then visit each discovered brand grid. This avoids hard-coding a URL
  scheme we're unsure of and degrades gracefully (FR-006) if B.TECH changes it. Subcategory
  traversal is not needed if brand facets are present.
- **Caps**: Overall cap of ~400 unique listings per run and a per-segment scroll cap unchanged
  (25). No hard wall-clock timer in v1 — the item cap plus the existing per-store delay keep a
  run inside the 30-min stale-job window; a timer can be added later if needed.
- **On segment failure**: Skip the segment, increment the run's parse-error counter, continue
  to the next. Never abort the whole run for one bad segment.
- **Pacing**: Keep the existing per-store request delay between segment page-loads; deeper
  traversal must not raise the request rate. Favor slower-but-safe over a fast full sweep.
- **Fallback**: If zero brand-filter links are discovered, scrape the base mobiles grid exactly
  as today, so coverage never regresses below the current ~20.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full B.TECH phone catalog is comparable (Priority: P1)

A shopper comparing phone prices sees B.TECH offers for phones beyond just the ~20 that
currently surface, so B.TECH is a meaningful price source across the whole catalog instead of
only a handful of popular models.

**Why this priority**: This is the entire point of the feature — more B.TECH coverage means
more products where a shopper can actually compare B.TECH's price against Dream2000's.

**Independent Test**: Run one B.TECH scrape and confirm it returns substantially more phone
listings than the current ~20 (e.g. covering multiple brands/models), and that those extra
offers appear on their matched product pages.

**Acceptance Scenarios**:

1. **Given** B.TECH lists phones across many brands, **When** a scrape runs, **Then** it
   collects listings from across the brand range, not only the default grid's first page.
2. **Given** the deeper scrape completes, **When** a shopper opens a mid-catalog phone that
   B.TECH sells but that was previously uncovered, **Then** a B.TECH offer is shown (subject
   to normal matching and 24h freshness).
3. **Given** the same phone appears under more than one traversal path (e.g. reachable from
   two brand filters), **Then** it is ingested once, not duplicated.

---

### User Story 2 - Deeper scraping stays polite and resilient (Priority: P1)

The site owner needs the wider traversal to not get B.TECH to block the server IP and to not
let one failing brand/segment abort the whole run.

**Why this priority**: B.TECH currently accepts the server IP; a fast, aggressive full sweep
risks the same datacenter-IP block that already took 2B offline. Resilience is a constitution
invariant (one broken source never blocks the rest).

**Independent Test**: Run a scrape with an intentionally broken segment (e.g. a bad brand
key); confirm the run still completes with the other segments' offers and records the failure
rather than aborting.

**Acceptance Scenarios**:

1. **Given** the configured per-request delay, **When** the scrape iterates segments, **Then**
   it waits at least that delay between page loads/segments (no faster than the current pace).
2. **Given** one brand/segment errors or times out, **When** the scrape continues, **Then**
   the remaining segments are still scraped and the run is not failed as a whole.
3. **Given** a run is in progress, **Then** the single-daemon / claim-complete rules are
   unchanged — exactly one scrape of B.TECH runs at a time.
4. **Given** a bounded run is desired, **When** an overall item or time budget is reached,
   **Then** the scrape stops cleanly and returns what it gathered so far.

---

### Edge Cases

- A brand filter returns zero results or an unexpected page layout → that segment contributes
  nothing and is recorded as a parse issue, without breaking others.
- A phone is missing a recognizable brand → it is still ingested (brand detection is
  best-effort, unchanged from today).
- B.TECH changes its brand-filter URL scheme → the run degrades to at least today's coverage
  (the base category grid) rather than returning nothing.
- Total catalog is very large → a configurable cap keeps a single run bounded in time so it
  fits inside the scheduler's stale-job window (30 min).
- Duplicate product URLs across segments → de-duplicated within the run before ingest.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The B.TECH scrape MUST traverse multiple segments of the phone catalog (brand
  filters and/or subcategories) rather than only the single default mobiles grid, so coverage
  materially exceeds the current ~20 items.
- **FR-002**: The scrape MUST de-duplicate listings by product URL across all traversed
  segments so each phone is ingested at most once per run.
- **FR-003**: The scrape MUST honor the store's configured request delay, pacing segment/page
  loads no faster than the current behavior; deeper traversal MUST NOT increase request rate.
- **FR-004**: A failure in one segment (network error, timeout, missing elements, empty grid)
  MUST NOT abort the run; remaining segments MUST still be scraped and the failure recorded in
  the run's parse-error/health counters.
- **FR-005**: The scrape MUST respect a configurable upper bound (max items and/or max
  segments and/or max duration) so a single run stays within the scheduler's stale-job window.
- **FR-006**: If the brand-filter traversal yields nothing (e.g. site scheme changed), the
  scrape MUST fall back to at least the current base-grid coverage rather than returning empty.
- **FR-007**: The feature MUST NOT change offer matching, variant resolution, ingest sanity
  rules, or any web UI — it only increases the volume of B.TECH listings fed into the existing
  pipeline.
- **FR-008**: The single-instance daemon and claim/complete scheduling behavior MUST remain
  unchanged.

### Key Entities

- **B.TECH segment**: a traversal unit (a brand filter or subcategory) that yields a grid of
  phone listings; the union of segments approximates the full phone catalog.
- **Raw listing**: unchanged existing shape (URL, title, price, brand, storage/RAM/color
  attrs, image) produced per card and handed to the existing ingest pipeline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A single B.TECH scrape ingests at least 5× the current count (≥ ~100 phone
  listings, subject to what B.TECH actually stocks), verified in the run audit.
- **SC-002**: Zero duplicate offers are created within a run for phones reachable via multiple
  segments.
- **SC-003**: A run with one deliberately broken segment still completes and ingests every
  other segment's offers.
- **SC-004**: A full run completes within the scheduler's 30-minute stale-job window at the
  configured delay.
- **SC-005**: B.TECH does not block the server IP across normal repeated scheduled runs (no
  new 403/429 pattern introduced relative to today).
- **SC-006**: No change is observed in matching accuracy, variant granularity, or any page
  layout — only B.TECH offer coverage increases.

## Assumptions

- B.TECH exposes phones filtered by brand (or comparable subcategory segmentation) via URLs
  the headless browser can load, similar to the existing category grid.
- The existing Playwright/Chromium setup (headless, `--no-sandbox` under systemd) remains the
  execution environment; no new store or protocol is introduced.
- "Full catalog" means practically all in-stock phones B.TECH lists; exhaustive completeness
  is not guaranteed if the site hard-caps a segment — the cap-avoidance is per-segment, which
  is why smaller brand grids beat one large grid.
- Delay/backoff/enabled and any new caps are configured through the existing per-store scraper
  settings / adapter config, honoring env-only configuration (constitution VI).
- Verification requires an environment with Playwright/Chromium installed (dev machine with
  `requirements-browser.txt`, or the server); it cannot be verified where only the core
  scraper deps exist.
