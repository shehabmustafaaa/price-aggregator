# Contracts: Missed-Search Admin View

## Page route

`GET /:locale/admin/missed-searches` — admin-only (via `getAdminUser` → `AdminGate` for
non-admins, FR-001), `dynamic = "force-dynamic"`, English-only copy (FR-008).

Renders a table of `MissedSearchRow` (see data-model.md), ordered by count desc:

| Column | Source |
|---|---|
| Term | `term` (representative raw query) |
| Count | `count` |
| Locale(s) | `locales` (e.g. "ar", "en", or both) |
| Last searched | `lastSearchedAt` |
| (action) | Dismiss button |

- **Empty state**: when there are zero groups, show a clear "No missed searches" message,
  not a blank/erroring page (FR-006, US1/AC3).

## Dismiss action

`dismissAction(formData)` in `.../missed-searches/actions.ts` — thin wrapper:

- **Input**: hidden field `normalized` (the group's normalization key).
- **Behavior**: `await getAdminUser()` guard → `dismissMissedSearch(normalized)` →
  `revalidatePath` so the row disappears and stays gone on reload (FR-005).
- **Read-only guarantee**: the ONLY write is deleting `missed_searches` rows; no product,
  variant, offer, store, or scrape record is created or modified (FR-007).
- **Idempotent**: dismissing an already-removed term deletes zero rows and does not error
  (edge case 4).
