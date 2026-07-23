# Feature Specification: Admin Operations

**Feature Branch**: `006-admin-operations`

**Created**: 2026-07-22

**Status**: Baseline — describes behavior already built and live at https://shehabw1.space.
Verified against the running product and current codebase (`web/src/lib/auth/admin.ts`,
`web/src/app/[locale]/admin/{scraper,review,catalog}/`, `web/src/lib/admin/catalog.ts`,
`web/src/lib/settings.ts`). Discrepancies discovered later should be resolved by
`/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.

**Input**: Split from the original combined baseline spec (`001-asaar-baseline`) into one
spec per domain so each can evolve independently. This spec owns: admin authentication/gating,
the scraper control-plane UI (store config, job/run visibility, per-URL audit viewing), the
match-review queue UI, and catalog curation (edit/merge/delete). It is the operator-facing
counterpart to [[005-scraping-ingest]], which produces the data this spec's UI displays and
the review queue this spec's UI resolves.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operate and curate the catalog (admin) (Priority: P2)

The site owner logs into an admin area to: control scraping (enable/disable stores,
intervals, delays, run-now, inspect runs and per-URL audits), resolve the match review queue,
and fix catalog quality (edit product names/images/descriptions, merge duplicates, delete
junk).

**Why this priority**: Solo-operated site; without curation tools, scraper noise degrades the
catalog produced by [[005-scraping-ingest]].

**Independent Test**: Log in as an admin, change a store's interval and save; verify the
value persists and a non-admin cannot reach the page.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they open the scraper page, **Then** they see all stores'
   config, recent jobs/runs with statuses, and can save all settings in one action without
   form-resubmission prompts.
2. **Given** a queued low-confidence match, **When** the admin approves or rejects it, **Then**
   the offer is attached or discarded accordingly.
3. **Given** two duplicate products, **When** the admin merges them, **Then** offers, history,
   and variants consolidate onto the survivor.
4. **Given** a non-admin user or anonymous visitor, **Then** all admin pages and actions are
   inaccessible.

---

### Edge Cases

- A non-admin or anonymous request hits an admin route or server action directly (bypassing
  the UI) — it MUST still be rejected, since gating happens at the auth-check level, not just
  by hiding navigation links.
- An admin merges two products that both have active price alerts or favorites — those rows
  MUST consolidate onto the survivor rather than being orphaned or dropped.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin area MUST be restricted to users flagged `isAdmin`; every admin page
  and server action MUST independently verify this (not merely hide UI for non-admins).
- **FR-002**: The scraper control-plane page MUST show all stores' scrape config
  (enabled/interval/delay), recent jobs and runs with statuses, and a manual run-now trigger,
  and MUST save all settings in one action using redirect-after-POST (`?saved=1`) to avoid
  resubmission prompts.
- **FR-003**: The scraper control-plane MUST provide a run-detail view of
  [[005-scraping-ingest]]'s per-URL audit events for the last 2 days, filterable by outcome,
  with data-quality badges.
- **FR-004**: The admin MUST be able to approve or reject queued low-confidence matches
  (`MatchReview`); approval attaches the offer to the suggested variant, rejection discards
  the listing.
- **FR-005**: The admin MUST be able to edit product names/images/descriptions, merge
  duplicate products (consolidating offers, price history, variants, favorites, and alerts
  onto the survivor), and delete junk products.
- **FR-006**: The admin MUST be able to toggle ingest auto-approve (auto-create unmatched
  products vs. always queue for review) via a persisted application setting.

### Key Entities

- **User.isAdmin**: the flag gating this entire spec's surface (see [[004-accounts-alerts]]
  for the `User` entity itself).
- **MatchReview**: a queued low-confidence scraped listing awaiting admin approve/reject,
  produced by [[005-scraping-ingest]]'s matcher.
- **AppSetting**: global key-value operational toggles, notably `ingest.auto_approve`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The owner can diagnose any scraped URL's outcome for runs from the last 2 days
  without reading server logs — entirely through the admin UI.

## Assumptions

- The site is solo-operated (one owner/admin); no multi-admin roles or permission tiers exist.
- No automated test suite exists yet (tracked in `BACKLOG.md`); verify admin changes manually
  by logging in as an admin and exercising the page/action in question.
- This spec documents built behavior; discrepancies discovered later should be resolved by
  `/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.
