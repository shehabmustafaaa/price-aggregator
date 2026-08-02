# Phase 0 Research: Recently-Viewed Products

No `NEEDS CLARIFICATION` markers. Decisions below settle storage shape, SSR safety, and
placement.

## Decision: `localStorage` with a small capped JSON array, logic in a client-safe `lib` module

- **Decision**: Store a single key (e.g. `asaar:recentlyViewed`) holding a JSON array of
  lightweight product snapshots, newest-first. `lib/recentlyViewed.ts` exports pure functions:
  `readRecent()`, `recordRecent(entry)` (dedupe by slug → unshift → cap), and the cap/key
  constants + the `RecentEntry` type. The component imports these.
- **Rationale**: Matches the user's stated mechanism (device-only, no account, no server);
  keeping the read/dedupe/cap logic in `lib/` (not the component) satisfies constitution I and
  makes it unit-testable without a DOM. A single key + array is the simplest durable shape.
- **Alternatives considered**: IndexedDB (overkill for ~10 entries); cookies (sent to the
  server every request — violates FR-005's "never sent to the server"); per-product keys
  (harder to cap/order). All rejected.

## Decision: SSR-safe — read storage only after mount, render nothing until then

- **Decision**: The component holds `entries` in state initialized empty; a `useEffect` reads
  `localStorage` (and records the current product, if provided) after mount, then sets state.
  Server render and first client render output nothing (or a stable placeholder), so there's
  no hydration mismatch.
- **Rationale**: `localStorage` doesn't exist on the server; reading it during render would
  crash SSR and reading it during initial client render would diverge from server HTML
  (hydration error). Deferring to `useEffect` is the standard, safe pattern and also gives the
  graceful "nothing when empty/unavailable" behavior (FR-007) for free.
- **Alternatives considered**: `suppressHydrationWarning` hacks — rejected as fragile; a
  server-rendered strip — impossible without server state, which the feature explicitly avoids.

## Decision: Snapshot stores slug + bilingual name + image; no price

- **Decision**: Each `RecentEntry` = `{ slug, nameEn, nameAr, image, viewedAt }`. The strip
  renders name (per locale) + image, linking to `/[locale]/p/[slug]`. No price is stored or
  shown.
- **Rationale**: FR-008 / constitution III — prices must never be shown stale, and pulling
  fresh prices would require a server round-trip that defeats the "purely client-side" design.
  Name + image is enough for "jump back to what I looked at". The product page it links to
  shows fresh prices.
- **Alternatives considered**: storing/fetching price for the strip — rejected (staleness +
  server dependency); storing only the slug and fetching names/images — rejected (needs a
  server call; the snapshot avoids it and still degrades gracefully if the product later
  changes).

## Decision: One component with an optional `current` prop; mount on product + home pages

- **Decision**: `<RecentlyViewed current={{slug,nameEn,nameAr,image}} />` on the product page
  (records `current`, then shows the strip excluding `current`); `<RecentlyViewed />` on the
  home page (records nothing, shows the strip). Exclusion of the current product is by slug.
- **Rationale**: One component, one behavior to reason about; the presence/absence of
  `current` cleanly distinguishes "record + show" from "show only" (FR-006 self-exclusion).
- **Alternatives considered**: separate Recorder and Strip components — more files for no
  benefit at this size.

## Decision: Cap at 12, most-recent first

- **Decision**: `MAX_RECENT = 12`.
- **Rationale**: Enough to cover a browsing session's "jump back" need without turning into a
  full history; keeps the strip to roughly one horizontal scroll. Single named constant, easy
  to tune.

## Open questions

None.
