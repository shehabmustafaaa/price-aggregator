# Phase 0 Research: Legal & Static Pages

No `NEEDS CLARIFICATION` items remained after `/speckit-clarify` (contact method = form +
email fallback; published address = owner's Gmail). Decisions below resolve the remaining
technical choices.

## Decision: Reuse the About-page pattern (`LegalPage` + inline AR/EN JSX)

- **Decision**: Privacy/Terms/Contact pages copy `web/src/app/[locale]/about/page.tsx`'s
  structure: `setRequestLocale`, `LegalPage` shell, `locale === "ar"` branch with inline
  content in both languages.
- **Rationale**: The shell already exists and defines the required style (typography,
  spacing, dark theme, `[&_h2]` section headings for longer legal docs); FR-002 asks for
  exactly this consistency. Long-form legal text lives naturally in JSX; translation files
  are for short UI strings, not multi-paragraph documents.
- **Alternatives considered**: Markdown files rendered at build time (new tooling for 3
  pages — rejected, constitution VII); putting full page text in `ar.json`/`en.json`
  (unwieldy for structured multi-section documents — rejected).

## Decision: Contact form = server action → `lib/contact/send.ts` → nodemailer

- **Decision**: `ContactForm` (client component) posts to a server action in
  `contact/actions.ts`, which calls `sendContactMessage()` in `web/src/lib/contact/send.ts`:
  zod-style validation (email format, message 1–5000 chars), honeypot check, per-IP
  in-memory rate limit (e.g. 3/hour), then nodemailer send to `CONTACT_EMAIL` with
  `replyTo` set to the visitor's address.
- **Rationale**: Mirrors the existing alert-email path (`lib/alerts/email.ts`) — same
  transport/env; no new infra; constitution I keeps the logic testable in `lib/`.
- **Alternatives considered**: API route instead of server action (no benefit — forms are
  in-app only); storing messages in a DB table (spec explicitly says email-only); external
  form service or CAPTCHA (overkill; FR-008 asks only for honeypot + rate limiting).

## Decision: Honeypot + in-memory per-IP rate limit satisfy FR-008

- **Decision**: Hidden field bots fill → silently "succeed" without sending; a
  `Map<ip, timestamps>` allows N submissions/hour, over-limit humans get a clear localized
  error.
- **Rationale**: Single Node process in prod (aaPanel Node Project), so in-memory state is
  reliable enough; loses state on restart, which only ever *loosens* the limit briefly —
  acceptable for inbox-flood protection.
- **Alternatives considered**: DB/Redis-backed rate limit — rejected (constitution VII, no
  Redis exists).

## Decision: Footer links live in the existing layout footer, labels via next-intl

- **Decision**: Extend the `<footer>` in `app/[locale]/layout.tsx` (currently just a ©
  line) with a nav row of locale-aware `Link`s to `/about`, `/privacy`, `/terms`,
  `/contact`; labels added to `web/messages/ar.json` and `en.json`.
- **Rationale**: One layout renders every public page, so FR-003 (footer on every page) is
  satisfied by a single edit; short labels are exactly what message files are for.
- **Alternatives considered**: A separate `Footer` component file — fine either way; kept
  inline unless the footer grows, matching the current layout's style.

## Decision: Contact address via `CONTACT_EMAIL` env var

- **Decision**: New optional env var `CONTACT_EMAIL` (documented in `web/.env.example` if
  present, and DEPLOY.md notes); falls back to the SMTP from-identity already configured.
  Rendered into the Contact page and used as the send-to address.
- **Rationale**: Constitution VI (env-only host config) + spec assumption that the address
  is swappable to a domain address later without content changes.
