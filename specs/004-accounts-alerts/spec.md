# Feature Specification: Accounts, Favorites & Price Alerts

**Feature Branch**: `004-accounts-alerts`

**Created**: 2026-07-22

**Status**: Baseline — describes behavior already built and live at https://shehabw1.space.
Verified against the running product and current codebase (`web/src/lib/alerts/`, `User` /
`Favorite` / `PriceAlert` models in `web/prisma/schema.prisma`, custom jose/bcryptjs auth per
`CLAUDE.md`). Discrepancies discovered later should be resolved by `/speckit-converge` or a
follow-up feature spec, not by silently editing this baseline.

**Input**: Split from the original combined baseline spec (`001-asaar-baseline`) into one
spec per domain so each can evolve independently. This spec owns: shopper accounts,
favorites, target-price email alerts, and self-serve password change. Alerts fire from data
produced by [[005-scraping-ingest]]'s post-ingest hooks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Track a product (accounts, favorites, alerts) (Priority: P3)

A shopper creates an account, saves favorites, and sets a target-price alert; when a fresh
offer meets the target, they receive an email.

**Why this priority**: Retention feature; valuable but the site is fully usable without an
account.

**Independent Test**: Set an alert above the current price, ingest a lower price, verify an
email alert is generated.

**Acceptance Scenarios**:

1. **Given** a registered shopper, **When** they favorite a product, **Then** it appears in
   their account page.
2. **Given** an active alert with a target price, **When** ingest records a fresh offer at or
   below target, **Then** an email notification is sent, the alert's last-fired time is
   recorded, and the alert stays active with a 24-hour re-fire cooldown (at most one email
   per day while the price remains at or below target).
3. **Given** any user, **When** they change their password from their account page, **Then**
   the old password stops working.

---

### Edge Cases

- An alert's target price is met by an offer that is itself stale (not yet re-confirmed) —
  the alert MUST NOT fire off stale data; only a fresh, ingest-confirmed offer qualifies.
- A user sets multiple alerts on the same product — each is evaluated and fires independently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support shopper accounts via email/password.
- **FR-002**: A registered shopper MUST be able to favorite products, visible on their account
  page.
- **FR-003**: A registered shopper MUST be able to set a target-price alert (email channel);
  when a fresh ingested price drop meets or beats the target, an email is sent and the
  alert's last-fired time is stamped. The alert remains active but MUST NOT re-fire within a
  24-hour cooldown; only the shopper deactivates or deletes an alert.
- **FR-004**: A registered shopper MUST be able to change their password from their account
  page; the previous password must stop working immediately after.

### Key Entities

- **User**: account (email, password hash, locale, admin flag — admin flag is consumed by
  [[006-admin-operations]], not this spec).
- **Favorite**: a user's saved product (user + product, one row per pair).
- **PriceAlert**: a user's target price on a product, channel (email today), active flag, last
  fired timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A price alert email is delivered within one scrape cycle of the qualifying price
  appearing.

## Assumptions

- Email is the only alert channel today; the schema reserves Telegram/WhatsApp/web-push as
  future channels but no delivery path exists for them yet.
- The site is fully usable without an account; accounts are additive, not gating.
- No automated test suite exists yet (tracked in `BACKLOG.md`); verify alert changes manually
  by ingesting a qualifying price and confirming email delivery.
- This spec documents built behavior; discrepancies discovered later should be resolved by
  `/speckit-converge` or a follow-up feature spec, not by silently editing this baseline.
