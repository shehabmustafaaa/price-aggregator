# Implementation Plan: Side-by-Side Spec Comparison

**Branch**: `014-spec-comparison` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

## Summary

A device-only compare set (localStorage, cap 4, mirrors recently-viewed spec 010) plus a
server-rendered `/compare?p=slugs` page. The page fetches the products, reuses `buildFeatures`
per product, unions the feature rows by label, adds a best-price row, flags rows whose values
differ, highlights the cheapest, and links each column to its product. A compare toggle on
product cards and a floating tray drive selection while browsing. No schema/ingest change.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (server components + client components), Prisma 7,
next-intl. **Storage**: existing tables (read-only); selection in browser localStorage.
**Testing**: `npm run build` + `npm run lint`; manual bilingual check. **Project Type**: web.

## Constitution Check

- **I. Logic in `lib/`**: PASS — comparison assembly in `lib/catalog/compare.ts`; client set in
  `lib/compare.ts`; pages/components are thin.
- **II. Bilingual/RTL**: PASS — reuses localized `buildFeatures`; new strings in `messages/*`;
  logical properties for RTL.
- **III. Data trust**: PASS — prices via existing `freshOfferWhere`/`bestPrice`; no raw offer
  queries.
- **VI/VII. Env/simplicity**: PASS — no new deps, no schema; localStorage like spec 010.
- IV/V (ingest/scraper): N/A.

No violations.

## Project Structure

```text
web/src/
├── lib/
│   ├── compare.ts                     # NEW: client localStorage set (read/toggle/remove/clear + event)
│   └── catalog/compare.ts             # NEW: getProductsForCompare(slugs) + buildComparison()
├── components/
│   ├── CompareToggle.tsx              # NEW: client toggle on product cards
│   ├── CompareTray.tsx                # NEW: client floating tray (count + Compare link + clear)
│   └── ProductCard.tsx                # EDIT: overlay a CompareToggle
├── app/[locale]/
│   ├── compare/page.tsx               # NEW: server-rendered comparison table
│   └── layout.tsx                     # EDIT: mount <CompareTray/>
└── ../messages/{en,ar}.json           # EDIT: "compare" namespace
```

## Design Detail

**`lib/compare.ts`** (client): `CompareItem {slug,nameEn,nameAr,image}`, `STORAGE_KEY`,
`MAX_COMPARE=4`, `CHANGED_EVENT="asaar:compare-changed"`. `readCompare()`, `toggleCompare(item)`
(add if absent & under cap, else remove; returns {list, atLimit}), `removeCompare(slug)`,
`clearCompare()`, `isInCompare(slug)`. Each mutator persists (guarded) and dispatches
`CHANGED_EVENT` so toggles + tray re-sync. All storage access try/caught (private-mode safe).

**`lib/catalog/compare.ts`** (server): `getProductsForCompare(slugs: string[])` — dedupe, cap 4,
fetch each with the same include as `getProductBySlug` (brand, category.specDefinitions,
variants→fresh offers→store), return in the requested order. `buildComparison(products, locale,
labels)` → `{ columns: {slug,name,image,price,storeCount}[], rows: {label, values:string[],
differs:boolean}[], cheapestIndex:number|null }`. Rows = union of `buildFeatures` labels (first-
seen order) with per-column value or "—"; `differs` = not all present values equal. Price row +
`cheapestIndex` from min `bestPrice`.

**`CompareToggle`** (client): small button/checkbox absolutely positioned in the card corner;
`stopPropagation`+`preventDefault` so it doesn't navigate; reflects `isInCompare` (mount + on
event); toggles.

**`CompareTray`** (client): fixed bottom bar; hidden when set empty; shows thumbnails + count +
"Compare (n)" Link to `/compare?p=slugs` (enabled at ≥2) + clear. Re-reads on `CHANGED_EVENT`.

**`compare/page.tsx`** (server): parse `?p=`, `getProductsForCompare`, if <2 show a prompt;
else render the table with sticky first column of labels, RTL-safe, differing rows tinted,
cheapest price cell highlighted, columns linking to `/p/[slug]`.

## Risks & Mitigations

- *Whole card is a `<Link>`* → toggle must stop propagation/prevent default (handled).
- *Hydration mismatch from localStorage* → read only after mount (recently-viewed pattern).
- *Long spec values overflow on mobile* → table wrapped in `overflow-x-auto`.

## Complexity Tracking

Not applicable — no violations.
