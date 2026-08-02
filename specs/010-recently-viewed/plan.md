# Implementation Plan: Recently-Viewed Products

**Branch**: `010-recently-viewed`

**Date**: 2026-08-02

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-recently-viewed/spec.md`

## Summary

A device-only "recently viewed" strip backed by browser `localStorage` — no accounts, no
server, no DB. A client-safe helper module (`lib/recentlyViewed.ts`) owns the read/record/
dedupe/cap logic; a client component `RecentlyViewed` records the current product on mount
(when given one) and renders the strip from storage, most-recent first, excluding the current
product and showing name + image only (no price, per constitution III). It's mounted on the
product page (records + shows "recently viewed") and the home page (shows only).

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router, React 19.2.4.

**Primary Dependencies**: None new — React client component + `localStorage`; next-intl for
locale/RTL; the `Link` from `@/i18n/navigation` for locale-aware links.

**Storage**: Browser `localStorage` only (key e.g. `asaar:recentlyViewed`). No PostgreSQL, no
migration, no server persistence.

**Testing**: Manual via quickstart.md (project norm).

**Target Platform**: Client (browser) for storage/render; the surrounding pages are the
existing server components.

**Project Type**: Web application, single `web/` service.

**Performance Goals**: Negligible — a tiny JSON array in localStorage, capped at N.

**Constraints**: Must be SSR-safe (no `localStorage` access during render/hydration — read in
`useEffect`, render nothing until mounted to avoid hydration mismatch); no price shown
(FR-008); renders in current locale/RTL from the stored bilingual snapshot (FR-006); silently
no-ops when storage is unavailable/empty (FR-007); logic in `lib/`, component thin
(constitution I).

**Scale/Scope**: 1 client-safe lib module + 1 client component + 2 one-line mounts (product
page, home page). No server/DB/API changes.

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | Record/read/dedupe/cap/parse logic in `web/src/lib/recentlyViewed.ts`; the component only calls it + renders. |
| II. Bilingual by construction | PASS | Snapshot stores `nameEn`/`nameAr`; strip renders per current locale, RTL via the page's `dir`. |
| III. Data trust is non-negotiable | PASS | The strip shows **no price** — it's a navigation aid linking to the live product page; nothing stale is ever shown as a price (FR-008). |
| IV/V. Ingest / scraping | N/A | Untouched. |
| VI. Env-only config | N/A | No host config. |
| VII. Simplicity first | PASS | Pure `localStorage`, no new dependency, no backend, no analytics — the minimum that delivers the feature. |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/010-recently-viewed/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── component-and-storage.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
web/src/
├── lib/
│   └── recentlyViewed.ts                # NEW: client-safe read/record/dedupe/cap + types (localStorage)
├── components/
│   └── RecentlyViewed.tsx               # NEW: "use client" — records current (if given) + renders strip
└── app/[locale]/
    ├── p/[slug]/page.tsx                # EDIT: mount <RecentlyViewed current={snapshot}/>
    └── page.tsx                         # EDIT: mount <RecentlyViewed/> (strip only)
```

**Structure Decision**: A single `RecentlyViewed` component with an optional `current` prop
serves both surfaces (record+show on a product page; show-only on the home page), so there's
one component to reason about. Storage logic lives in `lib/` per constitution I.

## Complexity Tracking

> Not applicable — no violations.
