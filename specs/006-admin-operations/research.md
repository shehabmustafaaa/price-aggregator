# Phase 0 Research: Admin Operations

**Status**: Baseline — verified against `web/src/lib/auth/admin.ts`,
`web/src/lib/admin/{catalog,review}.ts`, and the `admin/{scraper,review,catalog}` route
groups. No `NEEDS CLARIFICATION` markers.

## Decision: Admins are ordinary accounts with a flag, gated per page AND per action

- **Decision**: No separate admin login — an admin is a normal [[004-accounts-alerts]]
  session whose `User.isAdmin` is true (set via `npx tsx scripts/make-admin.ts <email>`).
  Every admin page and every server action calls `requireAdmin()` (throws) or
  `getAdminUser()` (null-checks) itself; verified: all 8 admin page/action files gate,
  including `catalog/[id]/actions.ts`.
- **Rationale**: Defense in depth — server actions are directly invokable endpoints, so
  hiding links is not gating (spec edge case 1). A single flag suffices for a solo operator
  (constitution VII).
- **Alternatives considered**: role tables / a proxy-level gate — rejected as needless for
  one admin; per-callsite checks also survive route refactors.

## Decision: Redirect-after-POST for all admin form saves

- **Decision**: Save actions end in `redirect(".../admin/scraper?saved=1")` (or `?queued=1`
  for Run-now); the page reads the flag to show a confirmation.
- **Rationale**: Prevents browser form-resubmission prompts on refresh (spec AC1) —
  documented convention in CLAUDE.md.

## Decision: Merge and delete are single transactions with explicit dependent handling

- **Decision**: `mergeProducts` (one `$transaction`) re-points variants (offers/history ride
  along), re-points alerts/favorites with dedupe (drop would-be duplicates), backfills
  target images if empty, deletes the source. `deleteProduct` cascades
  history/clicks/reports/offers/alerts/favorites/variants before the product row.
- **Rationale**: Spec AC3 + edge case 2 — consolidation must never orphan or drop rows
  observably; a transaction guarantees all-or-nothing.
- **Alternatives considered**: DB-level `ON DELETE CASCADE` — rejected; explicit
  app-level ordering keeps the dedupe logic (alerts/favorites) in one reviewable place.

## Decision: Review approval creates-and-attaches; rejection just closes

- **Decision**: `approveReview` takes admin-supplied bilingual names/slug/brand, creates
  the product, and attaches the queued listing; `rejectReview` marks the row rejected.
  Rows for URLs that later match automatically are auto-approved by the pipeline
  ([[005-scraping-ingest]]).
- **Rationale**: The queue exists precisely because the matcher lacked confidence — the
  human supplies the catalog identity rather than rubber-stamping a guess.

## Decision: Auto-approve is a persisted AppSetting, toggled from the scraper page

- **Decision**: `ingest.auto_approve` (default true) lives in `app_settings` via
  `lib/settings.ts`; the scraper admin page toggles it alongside store config in the same
  save action.
- **Rationale**: Operational toggle, not deploy config — must be flippable live when the
  matcher misbehaves, without a rebuild (contrast `NEXT_PUBLIC_*`).

## Open questions

None — baseline of already-built behavior.
