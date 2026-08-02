# Feature Specification: Missed-Search Admin View

**Feature Branch**: `008-missed-search-admin`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Missed-search admin view. The MissedSearch model already exists
(query, locale, createdAt) and search.ts already logs no-result queries. Build an admin-only
page (English-only, like /admin/scraper, gated by getAdminUser/AdminGate) that lists no-result
search queries so the owner knows which products/stores to add. Aggregate by normalized query
with counts and most-recent timestamp, sorted by frequency; show locale; allow
deleting/dismissing a query once handled. Read-only insight tool — no scraping or catalog
changes triggered from it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what shoppers searched for but couldn't find (Priority: P1)

The site owner (admin) opens a page that lists the search terms that returned zero results,
grouped so the same term isn't repeated, ordered with the most-searched terms first, so they
can decide which products or stores to add next.

**Why this priority**: This is the entire purpose of the feature — turning already-logged
missed-search data into an actionable list. Without the aggregated, ranked list there is no
feature. This story alone is a usable MVP.

**Independent Test**: Trigger several no-result searches (some repeated), open the admin
missed-search page, and confirm each distinct term appears once with a correct count, the
locale(s) it was searched in, and the most recent time it was searched, ordered by count
descending.

**Acceptance Scenarios**:

1. **Given** several zero-result searches have been logged (with some terms repeated),
   **When** the admin opens the missed-search page, **Then** each distinct search term is
   shown once with the number of times it was searched, the locale, and the most recent
   search time, sorted by search count (highest first).
2. **Given** the admin is not signed in as an admin, **When** they visit the missed-search
   page URL, **Then** they see the standard admin gate and not the missed-search data.
3. **Given** there are no logged missed searches, **When** the admin opens the page, **Then**
   they see a clear empty state rather than an error or blank page.

---

### User Story 2 - Dismiss a query once it's been handled (Priority: P2)

After the owner has acted on a missed search (added the product, or decided it's not worth
adding — e.g. a typo or an irrelevant term), they remove it from the list so the view keeps
showing only the queries that still need attention.

**Why this priority**: Keeps the list actionable over time instead of accumulating noise, but
the list is still valuable read-only without it, so it ranks below US1.

**Independent Test**: From the populated list, dismiss one query, confirm it disappears from
the list and does not reappear on refresh.

**Acceptance Scenarios**:

1. **Given** a missed-search term in the list, **When** the admin dismisses it, **Then** that
   term is removed from the list and does not reappear when the page is reloaded.
2. **Given** a term has been searched under two locales, **When** the admin dismisses that
   term, **Then** all logged occurrences of that term are cleared (the whole row goes away).
3. **Given** the admin dismisses the last remaining term, **When** the page reloads, **Then**
   the empty state is shown.

---

### Edge Cases

- Two searches that differ only by surrounding whitespace, letter case, or Arabic
  orthographic variants (e.g. alef forms) are treated as the same term so they aggregate into
  one row rather than appearing as near-duplicates.
- A term searched in both Arabic and English locales is shown so the owner can see it was
  wanted in both; dismissing the term clears it regardless of locale.
- A very large backlog of missed searches must still render usefully — the list shows the
  most valuable (highest-count / most-recent) terms first and does not attempt to display an
  unbounded number of rows on one screen.
- Dismissing a term that another concurrent action already removed does not error; the page
  simply reflects the current state on reload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an admin-only page that lists the search terms that
  produced zero results, reachable only by a signed-in admin (same gating as the existing
  scraper admin page); non-admins MUST see the standard admin gate.
- **FR-002**: The page MUST aggregate logged missed searches by normalized term so each
  distinct term appears as a single row, showing at least: the term, how many times it was
  searched, the locale(s) it was searched in, and the most recent time it was searched.
- **FR-003**: The list MUST be ordered by search count, most-searched first, so the highest-
  demand gaps surface at the top.
- **FR-004**: Normalization for aggregation MUST match how the site treats search terms
  (trimming whitespace, case-insensitive, and Arabic orthography normalization consistent
  with the rest of the site) so equivalent searches group into one row.
- **FR-005**: The admin MUST be able to dismiss a term, which removes all logged occurrences
  of that term so it no longer appears in the list; dismissal MUST persist across reloads.
- **FR-006**: The page MUST show a clear empty state when there are no missed searches (or
  after the last one is dismissed).
- **FR-007**: The page MUST be read-only with respect to the catalog and scraper — it MUST
  NOT create products, trigger scrapes, or change any store/catalog data; its only write
  action is dismissing (deleting) missed-search records.
- **FR-008**: The page MUST be English-only (admin surface convention), consistent with the
  existing scraper admin page.

### Key Entities *(include if feature involves data)*

- **Missed Search**: An already-existing record of a search that returned no results,
  capturing the search term, the locale it was searched in, and when it occurred. This
  feature reads and aggregates these records and deletes them on dismissal; it introduces no
  new stored entity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the admin area, the owner can reach the missed-search list and identify
  the single most-searched missing term in under 30 seconds (it is at the top of the list).
- **SC-002**: Repeated searches for the same term (after normalization) always collapse into
  exactly one row with an accurate count — no duplicate rows for equivalent terms.
- **SC-003**: A dismissed term disappears immediately and never reappears on subsequent
  visits (until, if ever, the term is searched again with no results).
- **SC-004**: A non-admin visitor can never view missed-search data through this page.

## Assumptions

- The existing `MissedSearch` logging (term, locale, timestamp) is the sole data source; no
  changes to how or when missed searches are captured are in scope. If a term is searched
  again after being dismissed and still returns no results, it will be logged and reappear —
  dismissal clears history, it does not permanently blacklist a term.
- "Dismiss" is implemented as deleting the underlying missed-search records for that term
  (there is no separate "handled/archived" state to preserve); this matches the read-only-
  insight intent and keeps the data model unchanged.
- The admin surface reuses the existing admin authentication/gating and English-only
  convention already established by the scraper admin page; no new roles or permissions are
  introduced.
- A sensible display cap (e.g. top N most-relevant terms) is acceptable rather than rendering
  every historical term at once; the exact number is an implementation detail chosen during
  planning.
- Exporting the list, charts/trends over time, and per-store gap analysis are out of scope
  for this feature; it is a simple ranked list plus dismiss.
