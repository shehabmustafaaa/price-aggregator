# Implementation Plan: Deals & Price History

**Branch**: `003-deals-and-history`

**Date**: 2026-07-22

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-deals-and-history/spec.md`

**Note**: This is a BASELINE plan — it documents a domain that is already built and live at
https://shehabw1.space. Phase 0/1 artifacts below record *existing* decisions verified
against the current codebase, not proposed ones.

## Summary

Deals and price history surface trust-building signal on top of [[001-catalog-comparison]]'s
fresh-offer data: `getBestDeals()` finds the biggest same-product-and-storage cross-store
spreads (capped at 45% to exclude implausible/matching-artifact spreads), `getPriceDrops()`
finds offers currently below their own 30-day high, and `getPriceHistory()` feeds a 90-day
daily chart on the product page. All three live in `web/src/lib/catalog/{deals,offers}.ts` as
raw SQL (`prisma.$queryRaw`) rather than the Prisma query builder, because they're
cross-row aggregations the builder doesn't express cleanly. `deals/page.tsx`,
`p/[slug]/page.tsx`, and the homepage are thin callers.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router, React 19.2.4.

**Primary Dependencies**: Prisma 7's `$queryRaw` (tagged-template, parameterized) against
PostgreSQL — the one place in the codebase that drops to raw SQL, because the aggregations
(per-product-per-storage min/max across stores; 30-day max per offer) aren't expressible as a
single Prisma query-builder call.

**Storage**: PostgreSQL — reads `offers`, `product_variants`, `products`, `stores`,
`price_history` (via a `LATERAL` join for the 30-day max).

**Testing**: None automated yet (`BACKLOG.md`). Verify by checking the deals page against
known fresh offers and confirming no entry exceeds a 45% spread.

**Target Platform**: Server-rendered pages, same as [[001-catalog-comparison]].

**Project Type**: Web application, single `web/` service.

**Performance Goals**: Not formally load-tested; deals/price-drop queries are bounded
(`LIMIT`) and run per page-load, not precomputed/cached.

**Constraints**: Both `getBestDeals()` and `getPriceDrops()` re-implement the freshness
predicate (`last_seen_at >= now() - interval '24 hours' AND store.active`) directly in raw SQL
rather than calling `freshOfferWhere()` — that TS helper returns a Prisma `where` object, which
`$queryRaw` cannot consume. This is a **documented, intentional exception** to "one shared
freshness gate" (constitution III / [[001-catalog-comparison]]'s research.md): the *value*
(24h, `store.active`) must still be kept in sync by hand across the TS helper and these two SQL
strings — there is no single source of truth for the threshold's numeric value, only for its
JS-side callers. `MAX_PLAUSIBLE_SPREAD = 0.45` lives once, as a named constant, in `deals.ts`.

**Scale/Scope**: Single category (phones); both queries scan all offers (bounded by 24h
freshness + `LIMIT`), acceptable at current catalog scale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | `getBestDeals`/`getPriceDrops` in `web/src/lib/catalog/deals.ts`, `getPriceHistory` in `web/src/lib/catalog/offers.ts`; pages only call and render. |
| II. Bilingual by construction | PASS | `DealRow`/`PriceDropRow` carry `nameEn`/`nameAr` straight from `products`. |
| III. Data trust is non-negotiable | **PASS, with a noted deviation** — see Constraints above. Both queries enforce the same 24h/`store.active` predicate as `freshOfferWhere()`, but as hand-duplicated SQL, not a shared call. `MAX_PLAUSIBLE_SPREAD` (45%) is a single named constant, correctly enforced in the `HAVING` clause. |
| IV/V. Ingest / scraping | N/A here | Owned by [[005-scraping-ingest]]. |
| VI. Category-extensible schema | PASS | Queries key on `product_id`/`store_id`/`offer_id` only — no phone-specific assumptions. |
| VII. Simplicity first (YAGNI) | PASS | Raw SQL for a genuinely SQL-shaped aggregation, not a premature caching/materialized-view layer; deals are computed on read, not on a schedule. |

**No violations requiring Complexity Tracking** — the freshness-predicate duplication is a
consequence of `$queryRaw` not composing with the TS `where`-object helper, not a rejected
simpler alternative. Recorded here so a future change to `OFFER_STALE_HOURS` in
`offers.ts` doesn't get missed in `deals.ts`.

## Project Structure

### Documentation (this feature)

```text
specs/003-deals-and-history/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/           # none — no external HTTP interface owned by this domain
└── tasks.md
```

### Source Code (repository root)

```text
web/src/
├── lib/catalog/
│   ├── deals.ts       # getBestDeals (45%-capped cross-store spread), getPriceDrops (vs 30-day high)
│   └── offers.ts      # getPriceHistory (90-day daily series) — shared file with 001
└── app/[locale]/
    ├── deals/page.tsx       # deals surface (thin caller of getBestDeals + getPriceDrops)
    ├── p/[slug]/page.tsx    # product page's price-history chart section (thin caller of getPriceHistory)
    └── page.tsx             # homepage's featured-deals strip (thin caller of getBestDeals)
```

**Structure Decision**: No new directories — documents existing `web/src/lib/catalog/deals.ts`
plus the shared `getPriceHistory` in `offers.ts`, per constitution I.

## Complexity Tracking

> Not applicable — no violation requiring justification, only a documented deviation noted
> above (raw-SQL freshness predicate duplication).
