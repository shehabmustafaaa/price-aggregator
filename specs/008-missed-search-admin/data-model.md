# Phase 1 Data Model: Missed-Search Admin View

No schema change. This feature reads and deletes existing `missed_searches` rows and computes
a transient aggregate.

## Existing entity (read + delete only)

### MissedSearch (`missed_searches`)

| Field | Notes |
|---|---|
| `id` | int PK |
| `query` | raw search text, stored trimmed by `search.ts` (NOT normalized) |
| `locale` | "ar" \| "en" |
| `createdAt` | when the zero-result search happened |

- **This feature never writes new rows** (logging stays owned by [[002-search-and-browse]]'s
  `search.ts`) and only ever **deletes** on dismiss.

## Transient aggregate (computed per page load, not stored)

### MissedSearchRow

| Field | Derivation |
|---|---|
| `term` | a representative raw `query` for the group (e.g. most recent) |
| `normalized` | `normalizeText(query)` — the grouping key (FR-004) |
| `count` | number of rows in the group |
| `locales` | distinct set of `locale` values in the group |
| `lastSearchedAt` | max `createdAt` in the group |

- **Ordering**: `count` desc (FR-003), then `lastSearchedAt` desc as a tiebreak.
- **Cap**: top 100 groups (research.md).
- **Validation/invariant**: two source rows collapse into the same `MissedSearchRow` iff
  their `normalizeText(query)` are equal (SC-002).

## Operations

| Operation | Effect |
|---|---|
| `aggregateMissedSearches(limit=100)` | read rows → group by `normalized` → sort → slice → return `MissedSearchRow[]` |
| `dismissMissedSearch(normalizedTerm)` | delete every `missed_searches` row whose `normalizeText(query)` == `normalizedTerm` |
