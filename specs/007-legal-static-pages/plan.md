# Implementation Plan: Legal & Static Pages

**Branch**: `007-legal-static-pages`

**Date**: 2026-07-23

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-legal-static-pages/spec.md`

## Summary

Add three public bilingual pages — Privacy Policy (`/[locale]/privacy`), Terms of Service
(`/[locale]/terms`), Contact (`/[locale]/contact`) — following the exact pattern the existing
About page already established (`setRequestLocale` + shared `LegalPage` component with
inline AR/EN content). Extend the existing footer in `app/[locale]/layout.tsx` with localized
links to all four static pages. The Contact page adds the one dynamic piece: a server-action
contact form (optional name, email, message) that sends to the owner's Gmail via the
existing nodemailer transport, with honeypot + simple rate limiting, plus the email shown as
a mailto fallback.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router, React 19.2.4.

**Primary Dependencies**: next-intl (locale routing, footer labels via `web/messages/ar.json`
/ `en.json`); nodemailer (already configured for price alerts — reused for contact
delivery); no new packages.

**Storage**: None — contact submissions are emailed, not stored (per spec Assumptions).
Rate-limit state is in-memory (per-process map), acceptable for a single Node process.

**Testing**: Manual via quickstart.md (no automated suite yet, per project norm).

**Target Platform**: Same `web/` service; pages are server-rendered, public, indexable.

**Project Type**: Web application, single `web/` service.

**Performance Goals**: Static-page rendering; no special targets.

**Constraints**: Contact email address from env (`CONTACT_EMAIL`, defaulting to the existing
SMTP identity) — never hardcoded (constitution VI); form logic in `lib/`, page/action thin
(constitution I); all copy bilingual with RTL-safe layout (constitution II); FR-008 honeypot
+ per-IP rate limit.

**Scale/Scope**: 3 new pages + footer edit + 1 server action + 1 lib module + message keys.

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | Contact send + rate limit go in `web/src/lib/contact/send.ts`; the page's server action validates-then-calls. Legal pages are pure content (no logic). |
| II. Bilingual by construction | PASS | Same inline AR/EN pattern as `about/page.tsx` inside `LegalPage`; footer labels via next-intl message files; RTL inherited from layout `dir`. |
| III. Data trust | N/A | No price data involved. |
| IV. Ingest pipeline | N/A | Untouched. |
| V. Scraping | N/A | Untouched. |
| VI. Env-only config | PASS | `CONTACT_EMAIL` env var; reuses existing SMTP env. |
| VII. Simplicity first | PASS | No CAPTCHA service, no DB table, no CMS — static content + honeypot/in-memory rate limit is the minimum that satisfies FR-008. |

No violations. Re-checked after Phase 1 design — unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/007-legal-static-pages/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── pages-and-form.md
└── tasks.md             # /speckit-tasks output (not created by /speckit-plan)
```

### Source Code (repository root)

```text
web/src/
├── lib/contact/send.ts                  # NEW: validate + rate-limit + sendContactEmail (nodemailer)
├── components/
│   ├── LegalPage.tsx                    # existing shared shell — reused as-is
│   └── ContactForm.tsx                  # NEW: client form (honeypot field, success/error states)
├── app/[locale]/
│   ├── about/page.tsx                   # existing pattern to copy (LegalPage + inline AR/EN)
│   ├── privacy/page.tsx                 # NEW: bilingual policy content in LegalPage
│   ├── terms/page.tsx                   # NEW: bilingual terms content in LegalPage
│   ├── contact/page.tsx + actions.ts    # NEW: info + ContactForm; server action → lib/contact/send
│   └── layout.tsx                       # EDIT: footer gains Privacy/Terms/Contact/About links
└── (web/messages/ar.json, en.json)      # EDIT: footer link labels + contact-form strings
```

**Structure Decision**: Follow the About-page precedent exactly (inline bilingual JSX in the
existing `LegalPage` shell) rather than introducing markdown/CMS content loading — three
pages don't justify new machinery.

## Complexity Tracking

> Not applicable — no violations.
