# Implementation Plan: Search & Browse

**Branch**: `002-search-and-browse`

**Date**: 2026-07-22

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-search-and-browse/spec.md`

**Note**: This is a BASELINE plan — it documents a domain that is already built and live at
https://shehabw1.space. Phase 0/1 artifacts below record *existing* decisions verified against
the current codebase, not proposed ones.

## Summary

Search and browse are the discovery layer feeding [[001-catalog-comparison]]. Search
(`searchProducts`) is Arabic-aware token matching done in-app over every product's name/
brand/model text *plus every store's raw listing title (fresh and stale)*, with zero-result
queries logged to `MissedSearch`. Browse (`listCategoryProducts`) paginates a category with
brand/price/spec filters, computed the same way as [[001-catalog-comparison]]'s listing
helpers (fresh-offer-derived best price, filtered/sorted in application code). All logic lives
in `web/src/lib/catalog/search.ts`, `web/src/lib/catalog/products.ts`, and
`web/src/lib/text.ts`; `web/src/app/[locale]/search/page.tsx` and
`web/src/app/[locale]/c/[slug]/page.tsx` are thin callers.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router, React 19.2.4.

**Primary Dependencies**: Prisma 7 against PostgreSQL; next-intl 4 for `[locale]` routing; no
external search engine (Meilisearch was evaluated and deferred, constitution VII).

**Storage**: PostgreSQL — reads `products`, `product_variants`, `offers` (titleRaw, fresh and
stale), `categories`, `brands`, `spec_definitions`; writes `missed_searches`.

**Testing**: None automated yet (`BACKLOG.md`). Verify by searching with an alternate Arabic
spelling and by applying brand/price/spec filters on a category page.

**Target Platform**: Server-rendered pages, same as [[001-catalog-comparison]].

**Project Type**: Web application, single `web/` service.

**Performance Goals**: Functional target is SC-001 (≥90% first-query search success for
language/spelling variants), not raw throughput.

**Constraints**: `searchProducts` currently loads *all* products into memory per query (no
DB-side full-text index) — acceptable at current catalog scale (single category, low
thousands of products) per constitution VII, but is the first thing to revisit if catalog size
grows. Search MUST include offer `titleRaw` even for stale offers (wording knowledge doesn't
expire), while price/availability shown for a found product still goes through
[[001-catalog-comparison]]'s `freshOfferWhere()`.

**Scale/Scope**: Single category (phones) today; `Category`/`SpecDefinition` are designed to
add categories without schema changes (constitution VI).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | `searchProducts`, `listCategoryProducts`, `getSpecFacets`, `normalizeText`/`searchTokens` all live in `web/src/lib/`; `search/page.tsx` and `c/[slug]/page.tsx` are thin callers. |
| II. Bilingual by construction | PASS | Search haystack concatenates `nameEn`/`nameAr`/brand/model/offer titles; `normalizeText` handles Arabic alef/hamza/taa-marbuta/alef-maqsura variants explicitly. |
| III. Data trust is non-negotiable | PASS | Offers included for display use `freshOfferWhere()`; the *search index* deliberately includes stale offer titles for findability, but never surfaces a stale offer's price — that distinction is documented, not accidental. |
| IV/V. Ingest pipeline / polite scraping | N/A here | Owned by [[005-scraping-ingest]]; this domain only reads `Offer.titleRaw` it already wrote. |
| VI. Category-extensible schema | PASS | `SpecDefinition` (key/label/unit/filterType per category) drives which filters render without a schema migration per category. |
| VII. Simplicity first (YAGNI) | PASS | In-app token search over all products, explicitly documented as the thing to swap for Meilisearch only if/when scale demands it — no premature search infra. |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-search-and-browse/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md             # not created by /speckit-plan
```

### Source Code (repository root)

```text
web/src/
├── lib/
│   ├── text.ts               # normalizeText, searchTokens — shared Arabic normalization
│   └── catalog/
│       ├── search.ts          # searchProducts: token match over name/brand/model + all offer titles; logs MissedSearch
│       └── products.ts        # listCategoryProducts/getSpecFacets/listLatestProducts/getCategoryBySlug/listBrandsInCategory (shared with 001)
└── app/[locale]/
    ├── search/page.tsx        # search results page (thin caller)
    └── c/[slug]/page.tsx      # category browse page: filters + pagination (thin caller)
```

**Structure Decision**: No new directories — documents existing `web/src/lib/text.ts` +
`web/src/lib/catalog/{search,products}.ts` + their thin page callers, per constitution I.

## Complexity Tracking

> Not applicable — Constitution Check reported no violations.
