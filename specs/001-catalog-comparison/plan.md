# Implementation Plan: Catalog & Price Comparison

**Branch**: `001-catalog-comparison`

**Date**: 2026-07-22

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-catalog-comparison/spec.md`

**Note**: This is a BASELINE plan — it documents the architecture of a domain that is already
built and live at https://shehabw1.space. Phase 0/1 artifacts below record *existing*
decisions verified against the current codebase, not proposed ones. Future changes to this
domain (e.g. a new comparison-view feature) should extend this baseline via a new spec, not
replace it wholesale.

## Summary

The catalog & comparison domain renders canonical products and their storage variants with
per-color best pricing, image galleries, and a ranked cross-store offer list — gated entirely
by a single shared 24h freshness check (`freshOfferWhere`) so nothing stale or unconfirmed is
ever shown. It also owns outbound-click tracking (`/go/[offerId]`) and the site-wide
presentation baseline (dark theme, installable PWA, RTL/mobile-responsive, About page). All
logic lives in `web/src/lib/catalog/` and `web/src/lib/tracking/`; `web/src/app/[locale]/p/
[slug]/page.tsx` and `web/src/app/go/[offerId]/route.ts` are thin callers per constitution I.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router, React 19.2.4 (no separate
backend — `web/` is the entire web app).

**Primary Dependencies**: Prisma 7 (`@prisma/adapter-pg` driver adapter) against PostgreSQL;
next-intl 4 for `[locale]` routing/RTL; Tailwind 4 for styling.

**Storage**: PostgreSQL, tables `products`, `product_variants`, `offers`, `price_history`
(history itself owned by [[003-deals-and-history]]), `outbound_clicks`, `stores`, `brands` —
defined in `web/prisma/schema.prisma`.

**Testing**: None automated yet (tracked in `BACKLOG.md`). Verify changes by loading a product
page with offers from ≥2 stores and confirming the comparison table, color picker, and
"Go to store" redirect all behave as specified.

**Target Platform**: Server-rendered pages on the aaPanel Linux production host; Windows for
local dev. No client-side framework beyond React/Next — no separate SPA build.

**Project Type**: Web application (server-rendered), single `web/` service.

**Performance Goals**: Not formally load-tested; functional target is SC-001 (product
comparison reachable in <30s / 3 interactions from landing).

**Constraints**: Every offer read for public display MUST go through `freshOfferWhere()`
(`web/src/lib/catalog/offers.ts`) — never a raw `prisma.offer.findMany`; `bestPrice()` and
color grouping must only ever see fresh offers as a result. Colors are normalized to one
canonical key at ingest time ([[005-scraping-ingest]] writes it); this domain only renders
`colorLabel()`, it does not re-normalize.

**Scale/Scope**: Two storage-keyed listings today (Dream2000, B.TECH offers), single category
(phones); designed to extend to more categories/stores without schema change (constitution
VI).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | All product/offer/click logic lives in `web/src/lib/catalog/{offers,products,colors}.ts` and `web/src/lib/tracking/clicks.ts`; `page.tsx`/`route.ts` files only call these and render/redirect. |
| II. Bilingual by construction | PASS | `Product.nameEn/nameAr`, `descriptionEn/descriptionAr`; `colorLabel(key, locale)` renders per-locale; manifest is `lang: "ar"`, `dir: "rtl"` by default. |
| III. Data trust is non-negotiable | PASS | `freshOfferWhere()` is the single gate used by every catalog read (`getVisibleOffersForProduct`, `getProductBySlug`, `listCategoryProducts`, `listLatestProducts`, `getSimilarProducts`); `getOfferForRedirect` deliberately bypasses it only for the outbound-click redirect (a user clicking a link they were already shown), the one documented, intentional exception. |
| IV. Ingest is a pipeline of stages | N/A here | Owned by [[005-scraping-ingest]]; this domain only consumes ingest's output (canonical color keys, resolved variants). |
| V. Scrape politely, survive blocks | N/A here | Owned by [[005-scraping-ingest]]. |
| VI. Category-extensible schema | PASS | `Product.categoryId`/`Brand` and `ProductVariant.attrs` (jsonb) require no migration to add a category; facet/filter helpers read attrs generically. |
| VII. Simplicity first (YAGNI) | PASS | Price filtering/sorting for listing pages is done in JS on a bounded (`take: 2000`) result set rather than adding a search/cache service — an explicit, documented trade-off (`products.ts` comment), acceptable at current catalog scale. |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-catalog-comparison/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/src/
├── lib/catalog/
│   ├── offers.ts     # freshOfferWhere (THE freshness gate), getVisibleOffersForProduct,
│   │                 # getOfferForRedirect (intentionally bypasses freshness), getPriceHistory
│   ├── products.ts   # getProductBySlug, getSimilarProducts, bestPrice, listLatestProducts,
│   │                 # listCategoryProducts (browse/filter logic is 002's, lives in same file)
│   └── colors.ts     # COLORS map, canonicalColor (ingest-time), colorLabel (render-time)
├── lib/tracking/
│   └── clicks.ts      # recordOutboundClick, reportWrongPrice
├── app/
│   ├── manifest.ts                     # PWA manifest — dark theme colors, standalone display
│   ├── [locale]/p/[slug]/page.tsx      # product/comparison page (thin caller)
│   ├── [locale]/p/[slug]/actions.ts    # product page server actions (e.g. report-price)
│   └── go/[offerId]/route.ts           # outbound redirect + click tracking (thin caller)
└── app/api/report-price/route.ts       # public "report wrong price" endpoint
```

**Structure Decision**: No new directories — this plan documents the existing `web/src/lib/
catalog/` + `web/src/lib/tracking/` + their thin route/page callers, per constitution I.

## Complexity Tracking

> Not applicable — Constitution Check reported no violations.
