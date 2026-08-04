# Implementation Plan: Editorial Cleanup of Auto-Created Product Names

**Branch**: `013-name-cleanup` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

## Summary

Add an admin-only page `/admin/catalog/needs-names` that lists products whose English name
still contains Arabic characters (the signature of `autoCreateProduct`, which seeds
`nameEn = nameAr =` the scraped Arabic base title), with an inline edit form to fix the names
and slug. Reuses the existing `updateProduct`. A fixed product drops off the list because it no
longer matches the Arabic-in-English flag — no new state or schema.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (server components + server actions),
Prisma 7. **Storage**: existing `Product` table (no migration). **Testing**: `npm run build`
+ `npm run lint`; manual admin check. **Project Type**: web (admin surface).

## Constitution Check

- **I. Business logic in `lib/`**: PASS — flag + query live in `lib/admin/name-cleanup.ts`; the
  page and action are thin callers.
- **II. Bilingual**: PASS — edits the bilingual `nameEn`/`nameAr` fields; admin chrome is
  English-only per existing convention (same as catalog/duplicates pages).
- **III / IV / V / VI**: N/A — no offers query, no ingest, no scraper, no schema/env change.
- **VII. Simplicity**: PASS — no new dependency, no new table; derives the flag from existing
  data and reuses `updateProduct`.

No violations → Complexity Tracking empty.

## Project Structure

```text
web/src/
├── lib/admin/
│   └── name-cleanup.ts                       # NEW: NEEDS_NAMES flag + listProductsNeedingNames()
└── app/[locale]/admin/catalog/
    ├── page.tsx                              # EDIT: add link to the new page
    └── needs-names/
        ├── page.tsx                          # NEW: list + inline edit form (mirrors duplicates/catalog pages)
        └── actions.ts                        # NEW: fixNamesAction -> updateProduct + revalidate
```

## Design Detail

- **`lib/admin/name-cleanup.ts`**:
  - `export const ARABIC_RE = /[؀-ۿﭐ-﷿ﹰ-﻿]/;`
  - `nameNeedsCleanup(nameEn: string): boolean` → `ARABIC_RE.test(nameEn)`.
  - `listProductsNeedingNames(take = 100)`: fetch products (id, nameEn, nameAr, slug, images,
    brand, variant offer counts) ordered by id desc, filter in JS with `nameNeedsCleanup`, slice
    to `take`. (Catalog is hundreds of rows — an app-side filter is fine and avoids DB-specific
    regex.) Returns a shaped list incl. `offerCount`.
- **`needs-names/page.tsx`**: admin-gated (`getAdminUser` / `AdminGate`), `force-dynamic`.
  Header with count + back link; for each product an inline `<form action={fixNamesAction}>`
  with `nameEn`/`nameAr`/`slug` fields (mirrors the catalog page's row form) plus image/brand/
  offer metadata and a "view" link.
- **`needs-names/actions.ts`**: `"use server"` `fixNamesAction(formData)` — admin check, parse
  `productId`+fields, call `updateProduct` (existing; trims, requires non-empty), then
  `revalidatePath("/admin/catalog/needs-names")`.
- **`catalog/page.tsx`**: add a second header link `Needs translation →` next to the existing
  "Duplicate suggestions →".

## Complexity Tracking

Not applicable — no violations.
