# Phase 1 Data Model: Recently-Viewed Products

No database entities and no migration — all state is client-side in `localStorage`.

## Client-only entity

### RecentEntry (`localStorage`)

| Field | Type | Notes |
|---|---|---|
| `slug` | string | product identity + link target (`/[locale]/p/[slug]`); dedupe key |
| `nameEn` | string | for EN rendering |
| `nameAr` | string | for AR rendering (RTL) |
| `image` | string \| null | first product image, or null (placeholder shown) |
| `viewedAt` | number | epoch ms; establishes recency order |

- Stored as a JSON array under a single key `asaar:recentlyViewed`, ordered **newest-first**.
- **Invariants**:
  - Unique by `slug` (re-viewing moves the entry to index 0, never duplicates — FR-003).
  - Length ≤ `MAX_RECENT` (12); on overflow the oldest (tail) entries are dropped (FR-004).
  - Persists until the browser clears storage (FR-005); never transmitted to the server.

## Operations (in `lib/recentlyViewed.ts`, client-safe)

| Operation | Effect |
|---|---|
| `readRecent(): RecentEntry[]` | parse the key; return `[]` if missing/invalid/unavailable (never throws) |
| `recordRecent(entry): RecentEntry[]` | drop any existing same-slug entry, `unshift` the new one with `viewedAt = Date.now()`, cap to `MAX_RECENT`, write back, return the list |
| `MAX_RECENT`, `STORAGE_KEY` | tunable constants |

- All operations guard `typeof window`/`localStorage` access in try/catch so private mode or
  storage-disabled browsers degrade to a no-op (FR-007, SC-005).

## State transitions

```
view a product page ──recordRecent──▶ entry at index 0 (deduped, list capped)
render strip         ──readRecent + filter(current slug)──▶ up to 12 - (0|1) entries, newest first
storage unavailable  ──▶ readRecent() = [] ──▶ strip renders nothing
```
