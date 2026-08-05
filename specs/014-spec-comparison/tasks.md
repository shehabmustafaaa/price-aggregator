# Tasks: Side-by-Side Spec Comparison

**Feature**: `014-spec-comparison` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

- [x] **T001** `web/src/lib/compare.ts`: client localStorage set — `CompareItem`, `MAX_COMPARE=4`,
  `readCompare`/`toggleCompare`/`removeCompare`/`clearCompare`/`isInCompare`, guarded, dispatch
  `asaar:compare-changed`. (FR-005)
- [x] **T002** `web/src/lib/catalog/compare.ts`: `getProductsForCompare(slugs)` (dedupe, cap 4,
  ordered fetch) + `buildComparison(products, locale, labels)` → columns/rows/cheapestIndex,
  reusing `buildFeatures`. (FR-001,2,3,4)
- [x] **T003** `web/src/components/CompareToggle.tsx`: client corner toggle (stopPropagation +
  preventDefault), reflects `isInCompare`, syncs on event. (FR-005)
- [x] **T004** `web/src/components/CompareTray.tsx`: client fixed tray — thumbnails, count,
  Compare link (≥2), clear; re-reads on event. (FR-006)
- [x] **T005** `web/src/components/ProductCard.tsx`: overlay a `CompareToggle`; make the card
  positioning `relative`. (FR-005)
- [x] **T006** `web/src/app/[locale]/layout.tsx`: mount `<CompareTray/>`. (FR-006)
- [x] **T007** `web/src/app/[locale]/compare/page.tsx`: parse `?p=`, build comparison, render
  RTL-safe table (sticky label column, differing rows tinted, cheapest highlighted, columns link
  to product); <2 selected → prompt. (FR-001..004,007)
- [x] **T008** `messages/en.json` + `messages/ar.json`: `compare` namespace (heading, add/remove,
  tray, limit, prompt, price, differs, etc.). (FR-007)
- [x] **T009** `npm run lint` + `npm run build` clean; manual check both locales. No scraper/
  ingest/model changes (FR-008). Update `BACKLOG.md` #6 done. Commit + push.
