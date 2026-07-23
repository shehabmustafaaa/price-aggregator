# Phase 0 Research: Automated Scraping & Ingest Pipeline

**Status**: Baseline — verified against `web/src/lib/scraper/jobs.ts`,
`web/src/lib/ingest/pipeline.ts` and its stage modules, `scraper/main.py`, and the three API
routes. No `NEEDS CLARIFICATION` markers.

## Decision: Web owns scheduling; the daemon is a dumb poller

- **Decision**: The daemon loops `POST /api/scraper/claim`; all scheduling intelligence
  (manual-first, per-store intervals, back-off, self-heal) lives in `claimNextJob()` on the
  web side. The claim response carries `storeSlug` + `requestDelaySeconds` so the daemon
  needs no config of its own beyond the web URL + secret.
- **Rationale**: One source of truth for schedule state, editable live in `/admin/scraper`
  without touching the server; the daemon stays stateless and trivially replaceable.
- **Alternatives considered**: cron per store (rejected: no back-off, no admin UI, config
  drift) and a queue service like BullMQ (rejected: constitution VII — a jobs table +
  polling covers the need).

## Decision: "Due" is keyed on the last attempt of ANY status

- **Decision**: A store is due when its most recent job (any status) is older than
  `scrapeIntervalMinutes`. A RUNNING job blocks new claims for that store.
- **Rationale**: Keying on last *success* made failing stores (missing Playwright, IP
  blocks) get re-claimed on every poll, flooding the jobs table — the fix is documented in
  the `jobs.ts` comment and commit `7ae58c9`. Failing stores now back off a full interval.
- **Alternatives considered**: exponential back-off per consecutive failure — rejected as
  unneeded complexity; a full fixed interval is enough at 2–3 stores.

## Decision: Stale-job self-heal instead of daemon locking

- **Decision**: Any job RUNNING >30 min (`STALE_JOB_MINUTES`) is auto-failed at the top of
  `claimNextJob()`, with a note. Single-instance daemon is an operational rule (systemd),
  not enforced by locks.
- **Rationale**: Covers the real failure (daemon dies mid-run) without distributed-lock
  machinery; a second daemon started by mistake self-heals within 30 min (spec edge case).
- **Alternatives considered**: DB advisory locks / heartbeats — rejected per constitution
  VII.

## Decision: Match order is existing-offer → model number → guarded token overlap

- **Decision**: An existing offer (same store+URL) keeps its product unconditionally. New
  offers try `matchOffer`: model-number match first, then bilingual token overlap with
  digit-token, qualifier, and Arabic-orthography guards. Below-confidence results either
  auto-create (when `ingest.auto_approve` is on, the default) or dedupe-queue into
  `match_review_queue`.
- **Rationale**: Model numbers are unambiguous when present; token overlap needs guards
  because phone titles differ only in digits/qualifiers ("Pro", "5G", storage). Sticky
  existing-offer matching prevents re-matching churn on every scrape.
- **Alternatives considered**: fuzzy string distance (rejected: fails exactly on the
  digit-only differences that matter for phones).

## Decision: Price sanity is ±60% vs the same offer's last-seen price, and rejects also queue for review

- **Decision**: `isPriceSane` rejects a new price >60% away from the offer's last stored
  price; the rejection is audited (`REJECTED_PRICE`) AND a `matchReview` row is created so a
  human sees it — a legitimate huge drop can be approved rather than silently lost.
- **Rationale**: Constitution III; scrape glitches (wrong element, currency confusion)
  produce exactly these jumps. Routing to review keeps the guardrail from eating real
  repricings.

## Decision: Variant key is storage only; color lives on the offer

- **Decision**: `resolveVariant` keys on storage (+network as informational);
  color is an offer attr, canonicalized once at ingest via `canonicalColor` — the only
  place normalization happens (see [[001-catalog-comparison]] research).
- **Rationale**: Stores omit RAM/color inconsistently; storage is the one attribute nearly
  always present, and per-color variants would fragment price comparison.

## Decision: Audit rows are bounded by time-based pruning inside the pipeline

- **Decision**: Every URL gets an `IngestEvent`; after writing a run's events, the pipeline
  deletes events whose run started >2 days ago. `ScrapeRun` rows are kept forever.
- **Rationale**: Full per-URL diagnosis for the recent window ([[006-admin-operations]]
  SC-001) without unbounded growth; the permanent health rows preserve long-term trends.
- **Alternatives considered**: a separate cron/cleanup job — rejected; pruning inline in
  the pipeline needs no extra scheduling.

## Open questions

None — baseline of already-built behavior.
