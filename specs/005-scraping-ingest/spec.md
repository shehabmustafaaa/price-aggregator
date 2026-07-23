# Feature Specification: Automated Scraping & Ingest Pipeline

**Feature Branch**: `005-scraping-ingest`

**Created**: 2026-07-22

**Status**: Baseline — describes behavior already built and live at https://shehabw1.space.
Verified against the running product and current codebase (`scraper/main.py`,
`scraper/adapters/`, `web/src/lib/scraper/jobs.ts`, `web/src/lib/ingest/`,
`web/src/app/api/ingest`, `web/src/app/api/scraper/*`). Discrepancies discovered later should
be resolved by `/speckit-converge` or a follow-up feature spec, not by silently editing this
baseline.

**Input**: Split from the original combined baseline spec (`001-asaar-baseline`) into one
spec per domain so each can evolve independently. This spec owns: the scraper daemon's
per-store scheduling and politeness, the claim/complete job protocol, the ingest pipeline
(normalize → classify → sanity → match → variant resolve → upsert → post-ingest hooks), and
the per-run/per-URL audit trail this pipeline produces. [[006-admin-operations]] owns the
admin UI that *views* this audit trail and the review queue it feeds; this spec owns
*producing* that data correctly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated multi-store price collection (Priority: P1)

The system continuously collects prices from covered stores on a per-store schedule with
per-store politeness delays, matches scraped listings to catalog products, and keeps the
catalog current without manual work — while remaining resilient to store blocking and bad
data.

**Why this priority**: The data pipeline IS the product's supply chain; stale or wrong data
destroys trust in [[001-catalog-comparison]] and [[003-deals-and-history]].

**Independent Test**: Trigger a store run from the admin panel; verify offers land on the
correct products/variants, a health record is produced, and every scraped URL has an audit
outcome.

**Acceptance Scenarios**:

1. **Given** an enabled store whose interval has elapsed since its last attempt (any outcome),
   **Then** the scheduler issues exactly one new run; failing stores back off a full interval.
2. **Given** a scraped listing matching an existing product, **Then** its offer attaches to
   the right storage variant with normalized color; **Given** no match and auto-approve on,
   **Then** a product is auto-created; with auto-approve off it enters a review queue.
3. **Given** a scraped price deviating >60% from the last known price, **Then** it is rejected
   and recorded.
4. **Given** a scraped listing that is an accessory (case, charger), **Then** it is skipped
   and recorded as such.
5. **Given** any run, **Then** per-URL audit outcomes (grabbed / auto-created / skipped /
   rejected / error) are recorded for 2 days, plus a permanent run health row.

---

### Edge Cases

- A store blocks the scraper's IP (403/429) → the run fails gracefully, that store backs off,
  other stores are unaffected; a persistently-blocked store can be disabled/hidden entirely
  (as done for 2B, disabled in prod for datacenter-IP blocking).
- The same color is named differently across languages/stores (أسود vs Black) → normalized to
  one canonical color before an offer is stored.
- A store omits storage/RAM/network from listing titles → variant resolution still succeeds,
  since the variant key is storage-only; RAM/network remain informational attrs when present.
- Bundles ("phone + free case") are kept; standalone accessories are filtered out.
- Two scraper daemons are started by mistake → jobs self-heal (a stale `RUNNING` job auto-fails
  after 30 minutes); the single-instance rule is documented, not just assumed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Scraping MUST be schedule-driven per store (interval, request delay, enabled
  flag) with a manual run-now trigger, a claim/complete job protocol between the web app and
  the daemon, stale-job self-healing (a `RUNNING` job with no completion after 30 minutes
  auto-fails), and scheduling back-off keyed on the last attempt of any status (so a failing
  store backs off a full interval instead of being retried immediately).
- **FR-002**: Ingest MUST run as a fixed pipeline of stages for every scraped listing:
  normalize (colors via canonical-color mapping), filter accessories, enforce ±60%
  price-sanity against the last known price, match to a product (model number first, then
  guarded bilingual token overlap), then either auto-create a product (toggleable) or queue
  the listing for review when unmatched, resolve the variant by storage, upsert the offer plus
  a price-history point, and finally run post-ingest hooks (e.g. price alerts).
- **FR-003**: Every scrape run MUST produce a permanent health row (offers seen/upserted,
  parse errors, rejects) and a per-URL audit event (retained 2 days) recording one of: grabbed,
  auto-created, skipped-accessory, rejected-price, review-queued, or error.
- **FR-004**: The scraper and web app MUST communicate only over the documented HTTP contract
  (`/api/ingest`, `/api/scraper/claim`, `/api/scraper/complete`), authenticated by a shared
  secret header, never a direct database connection from the scraper.
- **FR-005**: One broken store adapter MUST NOT block ingest of other stores' offers.

### Key Entities

- **Store**: scrape config (enabled flag, interval minutes, request-delay seconds) alongside
  its catalog identity (slug, name, domain, active flag).
- **ScrapeJob**: work-queue row for the claim/complete protocol (status, trigger
  manual/schedule, requested/started/finished timestamps).
- **ScrapeRun**: permanent per-run health row (status, offers seen/upserted, parse errors,
  rejects).
- **IngestEvent**: per-URL audit outcome for a run (outcome, reason, matched product if any);
  pruned after 2 days.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each enabled store is scraped successfully at its configured interval (default
  ~3h) without manual intervention for at least a week at a time.
- **SC-002**: 100% of scraped URLs in the last 2 days have a recorded audit outcome (no silent
  drops), which [[006-admin-operations]]'s run-detail UI can then surface to the owner.

## Assumptions

- Store coverage is currently Dream2000 (Shopify `products.json` API) and B.TECH
  (Playwright/Chromium, since it's a JS-rendered SPA); 2B exists as a built Magento-HTML
  adapter but is disabled in production due to datacenter-IP blocking.
- Exactly one scraper daemon instance runs at a time; this is an operational rule
  (`systemd asaar-scraper`, no pm2), not something the protocol prevents by locking.
- No automated test suite exists yet (tracked in `BACKLOG.md`); verify pipeline/adapter
  changes by running an adapter (`main.py mock` or `main.py <store>`) and checking the
  per-URL audit in [[006-admin-operations]]'s `/admin/scraper` run detail.
- This spec documents built behavior; discrepancies discovered later should be resolved by
  `/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.
