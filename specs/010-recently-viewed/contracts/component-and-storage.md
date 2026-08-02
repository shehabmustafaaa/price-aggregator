# Contracts: Recently-Viewed — Component & Storage

## Storage contract (`lib/recentlyViewed.ts`)

- **Key**: `asaar:recentlyViewed` (`STORAGE_KEY`).
- **Value**: JSON array of `RecentEntry` (see data-model.md), newest-first, length ≤
  `MAX_RECENT` (12).
- **`readRecent(): RecentEntry[]`** — returns `[]` on missing/corrupt/unavailable storage;
  never throws.
- **`recordRecent(entry: Omit<RecentEntry,"viewedAt">): RecentEntry[]`** — dedupe by `slug`,
  prepend with `viewedAt = Date.now()`, cap, persist, return the new list. No-op-safe when
  storage is unavailable (returns what it can, never throws).

## Component contract (`components/RecentlyViewed.tsx`, `"use client"`)

`<RecentlyViewed current={CurrentProduct | undefined} />`

- **`current`** (optional): `{ slug, nameEn, nameAr, image }` of the product whose page this is.
- **Behavior**:
  - On mount (`useEffect`): if `current` is provided, `recordRecent(current)`; then
    `readRecent()` and store in state. (SSR/first render → renders nothing.)
  - Renders a horizontally scrollable strip of entries, **excluding `current.slug`**, newest
    first, each: image (or placeholder) + locale-appropriate name, wrapped in a locale-aware
    `Link` to `/[locale]/p/[slug]`.
  - Renders **nothing** (no heading, no container) when the resulting list is empty (FR-007).
  - Shows **no price** (FR-008).
- **Locale**: uses the active locale for name selection and RTL; obtained via next-intl
  client hooks.

## Mount points

- `web/src/app/[locale]/p/[slug]/page.tsx`: `<RecentlyViewed current={{ slug, nameEn, nameAr, image: images[0] ?? null }} />` (records this product, shows the rest).
- `web/src/app/[locale]/page.tsx`: `<RecentlyViewed />` (strip only).

## Non-contract (explicitly out)

No server route, no API, no DB access, no price, no cross-device sync.
