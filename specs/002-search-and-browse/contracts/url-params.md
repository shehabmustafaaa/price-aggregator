# Contracts: Search & Browse — URL Query Parameters

**Status**: Baseline — these are the public, bookmarkable/shareable URL contracts for the two
pages this domain owns. Not a JSON API; documented because they're the interface a shopper
(or a shared link) depends on.

## `GET /:locale/search?q=<text>`

- `q` — free-text query (Arabic or English). Missing/empty → no search performed, empty
  results, no `MissedSearch` row (only an actual empty-token-match logs a miss).

## `GET /:locale/c/:categorySlug`

Backed by `listCategoryProducts(categoryId, filters, page, pageSize)`
(`web/src/lib/catalog/products.ts`).

| Param | Type | Meaning |
|---|---|---|
| `page` | integer, default 1 | clamped to `[1, totalPages]` server-side |
| `brand` | brand slug | exact match against `Brand.slug` |
| `minPrice` / `maxPrice` | number | filters on `bestPrice()` (fresh-offer derived, see [[001-catalog-comparison]]) |
| `sort` | `price_asc` \| `price_desc` \| `newest` (default) | |
| `ram` | comma-separated integers | matches `ProductVariant.attrs.ram_gb` |
| `storage` | comma-separated integers | matches `ProductVariant.attrs.storage_gb` |

`CATEGORY_PAGE_SIZE` = 24 (fixed, not a URL param). Invalid/out-of-range `page` values are
clamped rather than erroring.
