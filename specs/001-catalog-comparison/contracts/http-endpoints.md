# Contracts: Catalog & Price Comparison — HTTP Endpoints

**Status**: Baseline — documents endpoints as implemented under `web/src/app/`. Both are
public (no auth), part of the web app's own routes (no separate API service).

## `GET /go/:offerId`

Outbound redirect + click tracking. Source: `web/src/app/go/[offerId]/route.ts`.

- **Path param**: `offerId` — integer `Offer.id`.
- **Behavior**:
  1. Reject with `400` if `offerId` is not an integer.
  2. Look up the offer by id with **no freshness filter** (`getOfferForRedirect` — see
     research.md's documented exception).
  3. `404` if the offer doesn't exist at all.
  4. Record an `OutboundClick` (`offerId`, `referer` header, `NEXT_LOCALE` cookie value).
  5. `302` redirect to `offer.url`.
- **Failure modes**: `400 {"error":"bad offer id"}`, `404 {"error":"offer not found"}`.
- **Consumers**: "Go to store" links on product/category/deals pages.

## `POST /api/report-price`

Public "report wrong price" — no login required. Source:
`web/src/app/api/report-price/route.ts`.

- **Body** (JSON): `{ offerId: number (positive int, required), comment?: string (max 500) }`.
- **Behavior**: validates with zod; on success calls `reportWrongPrice(offerId, comment)`
  (`web/src/lib/tracking/clicks.ts`), which creates a `PriceReport` row (`resolved: false`).
- **Response**: `200 {"ok": true}` on success, `400 {"error":"invalid payload"}` on schema
  failure.
- **Note**: does not verify the offer exists — a report against a nonexistent/removed offer id
  is still recorded; [[006-admin-operations]] resolves/reviews these, not this domain.
