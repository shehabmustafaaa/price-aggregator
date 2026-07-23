# Quickstart: Legal & Static Pages

## Prerequisites

- `web` running locally (`npm run dev`); SMTP + `CONTACT_EMAIL` set in `web/.env` (for
  Scenario 3; other scenarios need no email config).

## Scenario 1 — Pages render bilingually with About styling (US1)

1. Open `/ar/privacy`, `/ar/terms`, `/ar/contact` — Arabic, RTL, styled like `/ar/about`.
2. Open the `/en/...` equivalents — English, LTR.
3. Switch language from a legal page — lands on the same page in the other locale.
4. Verify Privacy content covers: accounts, favorites/alerts, click + search logging,
   cookies, AdSense disclosure, privacy contact. Verify Terms covers: price accuracy
   disclaimer, not-the-seller, trademarks, liability.

## Scenario 2 — Footer links everywhere (FR-003)

1. On home, a product page, deals, search, and account pages (both locales), scroll to the
   footer: About / Privacy / Terms / Contact links present with localized labels; each
   navigates correctly. Check a mobile-width viewport too.

## Scenario 3 — Contact form happy path (US2)

1. Submit the form with a valid email + message.
2. Expect a localized success message; the owner's inbox receives the message with
   `replyTo` = the visitor's address.

## Scenario 4 — Validation, honeypot, rate limit, failure (FR-006/FR-008)

1. Submit with empty message / bad email → localized field errors, inputs preserved.
2. Fill the hidden honeypot field (via devtools) and submit → fake success, no email sent.
3. Submit 4× within an hour from one IP → 4th gets a rate-limit message.
4. Break SMTP config and submit → failure message pointing to the fallback email; no crash.

## Scenario 5 — Crawlability (FR-007)

1. `curl` each page logged-out: HTTP 200, full content, no `noindex` meta/header.
