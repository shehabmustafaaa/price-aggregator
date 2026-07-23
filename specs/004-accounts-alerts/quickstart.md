# Quickstart: Accounts, Favorites & Price Alerts

**Status**: Baseline validation guide. No automated test suite exists yet (`BACKLOG.md`).

## Prerequisites

- `web/.env` has `AUTH_SECRET` and SMTP settings (nodemailer) plus `NEXT_PUBLIC_SITE_URL`.
- Local DB migrated + seeded; `npm run dev` in `web/`.
- A way to trigger ingest with a chosen price (e.g. POST to `/api/ingest` with
  `x-ingest-secret`, or the scraper's mock adapter — see [[005-scraping-ingest]]).

## Scenario 1 — Register, log in, favorite

1. Register a new account from the account page (valid email, ≥8-char password).
2. From a product page, favorite the product.
3. **Expected**: the product appears on `/ar/account`; logging out and back in preserves it
   (AC1).

## Scenario 2 — Price alert fires on qualifying ingest

1. Set an alert with `targetPrice` above the product's current best price? No — set it
   *below* current price, then ingest an offer at or below the target.
2. **Expected**: within that ingest, an email is sent to the account's address in the
   account's locale, and the alert row's `lastFiredAt` is stamped (AC2 — note: the alert
   stays `active` with a 24h re-fire cooldown; see research.md).
3. Re-ingest the same low price immediately. **Expected**: no second email (cooldown).

## Scenario 3 — Self-serve password change

1. From the account page, change the password (correct current password, new ≥8 chars).
2. Log out; attempt login with the old password. **Expected**: rejected.
3. Log in with the new password. **Expected**: succeeds (AC3).

## Scenario 4 — Email failure isolation

1. Point SMTP at an unreachable host; trigger a qualifying ingest for two users' alerts.
2. **Expected**: ingest completes successfully (offers/history written); failures are logged
   per alert; no 500 from `/api/ingest`.
