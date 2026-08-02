# Tasks: Recently-Viewed Products

**Input**: Design documents from `/specs/010-recently-viewed/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — manual verification via quickstart.md (project norm).

**Organization**: Single P1 user story (spec.md has one story).

## Phase 1: Setup

_No setup — no new dependency, no migration, no server/DB change. Pure client-side feature._

---

## Phase 2: Foundational

- [X] T001 Create `web/src/lib/recentlyViewed.ts` (client-safe): export `RecentEntry` type (`slug`, `nameEn`, `nameAr`, `image: string|null`, `viewedAt: number`), `STORAGE_KEY = "asaar:recentlyViewed"`, `MAX_RECENT = 12`, `readRecent(): RecentEntry[]` (parse key; `[]` on missing/corrupt/unavailable; never throws — guard `typeof window`/`localStorage` in try/catch), and `recordRecent(entry: Omit<RecentEntry,"viewedAt">): RecentEntry[]` (drop same-slug, unshift with `viewedAt = Date.now()`, cap to `MAX_RECENT`, persist, return list; no-op-safe) — per data-model.md / contracts

**Checkpoint**: Storage logic available and DOM-free-testable.

---

## Phase 3: User Story 1 - Jump back to products I just looked at (Priority: P1) 🎯 MVP

**Goal**: Record viewed products device-side and show a most-recent-first strip that links back
to them, with no price and no server involvement.

**Independent Test**: quickstart.md Scenarios 1–8.

- [X] T002 [US1] Create `web/src/components/RecentlyViewed.tsx` (`"use client"`): props `{ current?: { slug; nameEn; nameAr; image: string|null } }`; state `entries` init `[]`; in `useEffect` call `recordRecent(current)` when `current` is set, then `readRecent()` → state (so SSR/first render output nothing — no hydration mismatch); render a horizontally scrollable strip excluding `current?.slug`, newest first, each = image (or placeholder) + locale name (`useLocale`/`useTranslations` from next-intl) wrapped in `Link` (`@/i18n/navigation`) to `/p/[slug]`; render `null` when the list is empty (FR-007); show NO price (FR-008) (depends on T001)
- [X] T003 [US1] Mount `<RecentlyViewed current={{ slug: product.slug, nameEn: product.nameEn, nameAr: product.nameAr, image: product.images[0] ?? null }} />` on the product page `web/src/app/[locale]/p/[slug]/page.tsx` (records this product + shows the rest; self-excluded) (depends on T002)
- [X] T004 [P] [US1] Mount `<RecentlyViewed />` (strip only) on the home page `web/src/app/[locale]/page.tsx` (depends on T002)

**Checkpoint**: Strip records on product view and renders on home + product pages.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T005 Add a localized heading for the strip (e.g. "Recently viewed" / "شوهدت مؤخراً") to `web/messages/en.json` and `web/messages/ar.json`, and use it in `RecentlyViewed.tsx` (shown only when the strip is non-empty)
- [ ] T006 Run quickstart.md Scenarios 1–8 (order, dedupe, cap, persistence, self-exclusion, locale/RTL, empty + storage-disabled, no-price/no-server) locally; fix anything found
- [X] T007 Update `BACKLOG.md`: mark recently-viewed products done

---

## Dependencies & Execution Order

- Foundational T001 first (blocks the component) → T002 (component) → T003 + T004 (mounts, T004 ∥ T003) → Polish
- T005 edits the component created in T002 (sequential on that file if done after; fine to fold into T002)

## Parallel Example

```text
After T002 exists: T003 (product-page mount) and T004 (home-page mount) touch different files
and can be done in parallel.
```

## Implementation Strategy

MVP = T001–T003 (lib + component + product-page mount): recording and a working strip on
product pages already delivers "jump back". T004 (home strip) and T005 (heading) are quick
follow-ons. No migration, no server change — ships as a code-only deploy.
