# Contracts: Scraper ↔ Web HTTP Protocol

**Status**: Baseline — the only coupling between `scraper/` and `web/`. All three endpoints
require header `x-ingest-secret: <INGEST_SECRET>` (shared via both services' `.env`); a
missing/wrong secret returns `401 {"error":"unauthorized"}`.

## `POST /api/scraper/claim`

Polled by the daemon. Source: `web/src/app/api/scraper/claim/route.ts` → `claimNextJob()`.

- **Body**: none required.
- **Response**: `200 {"job": null}` when nothing is due, or
  `200 {"job": {"jobId": number, "storeSlug": string, "requestDelaySeconds": number}}`.
- **Side effects**: auto-fails stale RUNNING jobs (>30 min); marks the returned job RUNNING.

## `POST /api/ingest`

The pipeline entry point. Source: `web/src/app/api/ingest/route.ts` → `ingest()`. Schema:
`web/src/lib/ingest/schema.ts` (zod — authoritative).

- **Body** (JSON): `ingestPayloadSchema`:
  - `store_slug: string`, `category_slug: string` — must exist or the whole request 500s.
  - `run_started_at?: ISO datetime with offset`
  - `parse_errors?: int ≥ 0` (default 0) — scraper-side stat for the health row.
  - `offers: RawOffer[]`, each: `url` (URL), `title` (≥3 chars), `price` (>0),
    `shipping_cost?`, `currency` (default "EGP"), `in_stock` (default true),
    `condition` (NEW|USED|REFURBISHED), `warranty_type`
    (OFFICIAL_LOCAL|IMPORTED|UNKNOWN), `region_version?`, `brand?`, `model_number?`,
    `attrs` (object, e.g. `{"storage_gb":256,"color":"black"}`), `image_url?`,
    `image_urls[]`.
- **Response**: `200 {scrapeRunId, offersSeen, offersUpserted, rejects, sentToReview}`;
  `400 {"error":"invalid payload", issues}` on schema failure; `500` on unknown
  store/category or pipeline throw.
- **Guarantee**: one `ScrapeRun` row per call and one `IngestEvent` per offer, regardless
  of per-offer outcomes.

## `POST /api/scraper/complete`

Job outcome report. Source: `web/src/app/api/scraper/complete/route.ts` → `completeJob()`.

- **Body**: `{job_id: positive int, status: "DONE"|"FAILED", note?: string|null}` (note
  truncated to 500 chars).
- **Response**: `200 {"ok": true}` or `400 {"error":"invalid payload"}`.

## Adapter interface (Python side)

Each adapter in `scraper/adapters/` implements `scrape() -> list[ScrapeResult]` and accepts
`request_delay_s` (from the claim response) — new store = new adapter file + one branch in
`main.py build_adapter`. Adapters never talk to the DB; they only produce offers for
`/api/ingest`.
