# Tasks: Editorial Cleanup of Auto-Created Product Names

**Feature**: `013-name-cleanup` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

- [x] **T001** `web/src/lib/admin/name-cleanup.ts`: `ARABIC_RE`, `nameNeedsCleanup(nameEn)`,
  and `listProductsNeedingNames(take=100)`. Regex verified: Arabic + Arabic-Indic digits flag,
  Latin names don't. (FR-001)
- [x] **T002** `needs-names/actions.ts`: `fixNamesAction` — admin-gate, requires non-empty
  productId/nameEn/nameAr/slug, calls `updateProduct`, `revalidatePath`. (FR-002)
- [x] **T003** `needs-names/page.tsx`: admin-gated (`force-dynamic`) list with per-product
  inline edit form, image/brand/offer metadata, view + full-edit links, empty state. (FR-001,3,4)
- [x] **T004** `catalog/page.tsx`: added `Needs translation →` header link. (FR-004)
- [x] **T005** `npm run build` clean — new route `/[locale]/admin/catalog/needs-names`
  registered. Only new lib + admin page/action + one link added; no scraper/matching/public-UI
  changes (FR-005). (The two lint findings are pre-existing files, not this feature.) BACKLOG #8
  marked done.
