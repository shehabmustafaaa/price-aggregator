# Phase 1 Data Model: Admin Operations

**Status**: Baseline — reflects `web/prisma/schema.prisma` as built. This domain mostly
*operates on* entities owned elsewhere; listed here is what it reads/writes and the
invariants it enforces.

## Entities in scope

### User.isAdmin (owned by [[004-accounts-alerts]])

Boolean flag, default false; set only by `web/scripts/make-admin.ts`. The sole
authorization input for every admin surface.

### MatchReview (written by [[005-scraping-ingest]], resolved here)

`status`: `pending` → `approved` (admin approval, or auto when the URL attaches via
ingest) | `rejected`. `rawPayload` preserves the full scraped offer so approval can build
the product without re-scraping.

### AppSetting

`ingest.auto_approve` ("true"/"false" string): toggled from the scraper admin page;
consumed by the ingest pipeline's unmatched-offer branch.

### Store / ScrapeJob / ScrapeRun / IngestEvent (owned by [[005-scraping-ingest]])

Read for the overview (all stores + last 20 jobs + last 20 runs) and the run-detail audit;
written only through `updateStoreScrapeConfig` (clamps: interval ≥15 min, delay ≥1 s) and
`requestRun` (deduped manual job).

### Product and dependents (owned by [[001-catalog-comparison]])

Admin edit writes names/slug/brand/descriptions/specs (validated JSON)/images (URL-per-line,
http(s)-filtered). Brand edit upserts by slugified name.

## Invariants enforced by this domain

- **Merge** (`mergeProducts`, one transaction): source ≠ target; variants (with offers +
  history) re-point to target; alerts/favorites re-point with duplicate-drop; target gains
  source images only if it has none; source row deleted. Nothing is left referencing the
  source id.
- **Delete** (`deleteProduct`, one transaction): dependents removed in FK-safe order
  (priceHistory, outboundClicks, priceReports, offers, alerts, favorites, variants) before
  the product.
- **Gating**: no admin read or write path exists that does not first pass
  `requireAdmin()`/`getAdminUser()`.

## State transitions

```
MatchReview.status: pending ──approveAction──▶ approved (product created + attached)
                    pending ──rejectAction──▶ rejected
AppSetting[ingest.auto_approve]: "true" ⇄ "false"  (admin toggle)
User.isAdmin: false ──scripts/make-admin.ts──▶ true
```
