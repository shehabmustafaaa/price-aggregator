# Phase 0 Research: Missed-Search Admin View

No `NEEDS CLARIFICATION` markers. Decisions below settle the technical choices; all are
constrained by existing patterns.

## Decision: Aggregate in application code, not SQL GROUP BY

- **Decision**: `aggregateMissedSearches()` fetches recent `missed_searches` rows and groups
  them in JS keyed on `normalizeText(query)`, accumulating count, the set of locales, and the
  max `createdAt`; then sorts by count desc and slices to top-N (default 100).
- **Rationale**: FR-004 requires grouping by the site's Arabic-aware normalization
  (`normalizeText` — alef folding, diacritics, case, whitespace). That logic lives in JS
  (`lib/text.ts`); a raw `GROUP BY query` in SQL would treat "جالكسي" and "جالاكسي" (or case/
  whitespace variants) as distinct rows, violating FR-004 and SC-002. The missed-search table
  is small (zero-result queries only), so an in-memory pass is cheap — consistent with how
  `search.ts` and the catalog listing already aggregate in JS (constitution VII).
- **Alternatives considered**: (a) a normalized column added to the schema + SQL GROUP BY —
  rejected: introduces a migration and a write-path change to keep it in sync, for no benefit
  at this data volume; (b) `GROUP BY lower(trim(query))` in SQL — rejected: still misses
  Arabic orthographic folding, so it wouldn't satisfy FR-004.

## Decision: "Dismiss" deletes all rows matching the normalized term

- **Decision**: `dismissMissedSearch(term)` deletes every `missed_searches` row whose
  `normalizeText(query)` equals the normalized dismissed term (fetch candidate ids, delete by
  id) — clearing all locales/casings of that term in one action (FR-005, edge case 2).
- **Rationale**: Spec Assumptions define dismiss as deletion (no archived state, model
  unchanged). Matching on the normalized form ensures the whole aggregated row disappears,
  not just the exact string variant the admin happened to see.
- **Alternatives considered**: a `dismissed` boolean column — rejected (schema change; spec
  explicitly says delete). Deleting by exact raw string — rejected: would leave sibling
  casings/spellings behind, contradicting SC-002/FR-005.
- **Concurrency**: deletion is by current-matching ids; if another action already removed
  them, the delete simply affects zero rows and the page reflects truth on reload (edge case
  4) — no error.

## Decision: Reuse the `/admin/review` page shape and gating verbatim

- **Decision**: Server component with `export const dynamic = "force-dynamic"`,
  `if (!(await getAdminUser())) return <AdminGate/>`, English-only copy, a table of rows, and
  a per-row `<form action={dismissAction}>`; the action calls the lib function then
  `revalidatePath`.
- **Rationale**: This is the established, already-audited admin-tool pattern (FR-001, FR-008);
  matching it keeps gating correct by construction and the surface consistent.
- **Alternatives considered**: client-side fetch/table — rejected; server component + server
  action is the house style and needs no API route.

## Decision: Top-N display cap

- **Decision**: Default cap 100 rows (highest-count first). Spec edge case + Assumptions allow
  a sensible cap rather than unbounded rendering.
- **Rationale**: The highest-count terms are the actionable ones; 100 is comfortably enough
  for a solo owner to act on and keeps the page fast regardless of backlog size.
