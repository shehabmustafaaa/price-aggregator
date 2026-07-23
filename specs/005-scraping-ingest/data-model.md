# Phase 1 Data Model: Automated Scraping & Ingest Pipeline

**Status**: Baseline — reflects `web/prisma/schema.prisma` as built.

## Entities in scope

### Store (scrape-config fields)

`scrapeEnabled`, `scrapeIntervalMinutes` (default 360, admin-save clamps ≥15),
`requestDelaySeconds` (default 5, clamps ≥1), plus `active` (also gates the freshness
helper). Display fields belong to [[001-catalog-comparison]].

### ScrapeJob

Work-queue row: `status` (PENDING → RUNNING → DONE/FAILED), `trigger` (`manual` |
`schedule`), `requestedAt`/`startedAt`/`finishedAt`, `note`.

- **Invariants**: manual PENDING jobs claimed before any scheduled work; at most one
  PENDING/RUNNING job per store for manual requests (`requestRun` dedupes); RUNNING >30 min
  ⇒ auto-FAILED with a "stale" note.

### ScrapeRun

Permanent per-run health row: `status` (RUNNING → SUCCESS | PARTIAL | FAILED), timestamps,
`offersSeen`, `offersUpserted`, `parseErrors` (scraper-reported), `rejects`, `note`
(auto-created / accessories-skipped / sent-to-review counts).

- **Status rule** (as built): `FAILED` if 0 upserted, `PARTIAL` if any rejects or
  review-queued, else `SUCCESS`.

### IngestEvent

Per-URL audit: `runId` (cascade delete), `url`, `title` (≤300 chars), `price`, `outcome`
(GRABBED | AUTO_CREATED | SKIPPED_ACCESSORY | REJECTED_PRICE | REVIEW_QUEUED | ERROR),
`reason`, `productId`.

- **Invariant**: exactly one event per payload offer per run; pruned when the owning run is
  >2 days old (pruning executes inside `ingest()`).

### MatchReview (written here, resolved in [[006-admin-operations]])

`storeId`, `rawTitle`, `rawUrl`, `rawPayload` (full offer JSON), optional
`suggestedProductVariantId`, `confidence`, `status` (`pending` | `approved` | `rejected`).

- **Invariants**: pending rows deduped per store+URL; price-sanity rejects also queue here
  (confidence 0, suggesting the existing variant); when a URL later attaches successfully,
  its pending rows auto-flip to `approved`.

### AppSetting

Key-value toggles; `ingest.auto_approve` (default true) selects auto-create vs review-queue
for unmatched offers.

## Derived / side-effect writes

- **Offer upsert**: keyed `(storeId, url)`; refreshes `lastSeenAt` (the freshness clock),
  re-points `productVariantId` if resolution changed, updates price/stock/warranty/attrs.
- **PriceHistory append**: on first sighting or any price/stock change (not on unchanged
  re-confirmations).
- **Product image backfill**: listing images (≤6) copied onto products that have none.
- **PriceChangeEvent** → post-ingest hooks (alerts, [[004-accounts-alerts]]).

## State transitions

```
ScrapeJob:  PENDING ──claim──▶ RUNNING ──complete──▶ DONE | FAILED
                                  └──30 min stale──▶ FAILED (self-heal)
ScrapeRun:  RUNNING ──ingest() finish──▶ SUCCESS | PARTIAL | FAILED
MatchReview: pending ──admin──▶ approved | rejected
             pending ──URL attaches via ingest──▶ approved (auto)
```
