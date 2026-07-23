# Implementation Plan: Accounts, Favorites & Price Alerts

**Branch**: `004-accounts-alerts`

**Date**: 2026-07-22

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-accounts-alerts/spec.md`

**Note**: This is a BASELINE plan — it documents a domain that is already built and live at
https://shehabw1.space. Phase 0/1 artifacts record *existing* decisions verified against the
current codebase, not proposed ones.

## Summary

Accounts are custom email/password auth (bcryptjs hash + jose HS256 JWT in an httpOnly
`session` cookie — NOT NextAuth, per constitution). Registered shoppers favorite products and
set target-price alerts; alerts fire from [[005-scraping-ingest]]'s post-ingest hook
(`web/src/lib/alerts/hook.ts` registers `checkAlerts` via `registerPostIngestHook`), sending
a bilingual email via nodemailer and stamping `lastFiredAt` with a 24h re-fire cooldown. All
logic lives in `web/src/lib/auth/` and `web/src/lib/alerts/`; the account page and product
page server actions are thin callers.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.10 App Router, React 19.2.4.

**Primary Dependencies**: jose (JWT sign/verify, HS256, `AUTH_SECRET` env), bcryptjs (cost
10), nodemailer (SMTP from env) — no NextAuth, no external auth provider.

**Storage**: PostgreSQL — `users`, `favorites` (composite PK userId+productId),
`price_alerts` (target price, channel, active, lastFiredAt).

**Testing**: None automated (`BACKLOG.md`). Verify via quickstart.md: register, favorite,
set an alert above current price, ingest a lower price, confirm email.

**Target Platform**: Server-rendered pages + server actions; same host as the rest of `web/`.

**Project Type**: Web application, single `web/` service.

**Performance Goals**: N/A — low-volume account operations; alert evaluation is bounded by
per-ingest price-change events.

**Constraints**: Session cookie is httpOnly/lax/secure-in-prod, 30-day expiry. Alerts fire
only on price *drops or first sightings* (`oldPrice === null || newPrice < oldPrice`) and only
for `active` alerts whose `targetPrice >= newPrice`, with a 24h `REFIRE_COOLDOWN_H`. Email
failures are logged and swallowed per alert — one bad address can't block the ingest pipeline
(constitution IV: hooks must not break the pipeline).

**Scale/Scope**: Email is the only live channel; schema reserves TELEGRAM/WHATSAPP/WEB_PUSH.
Password reset by email does NOT exist (only logged-in self-serve change) — future work.

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Business logic in `lib/` | PASS | `registerUser`/`verifyUser`/`changePassword` in `web/src/lib/auth/user.ts`; session in `auth/session.ts`; alert logic in `alerts/hook.ts`+`alerts/email.ts`; `account/actions.ts` and `p/[slug]/actions.ts` are thin callers. |
| II. Bilingual by construction | PASS | Alert emails are composed per `user.locale` (AR/EN subject + body); account UI via next-intl. |
| III. Data trust non-negotiable | PASS | Alerts fire only from ingest-confirmed price-change events (never from stale reads); spec's stale-data edge case is satisfied structurally — the hook only sees fresh ingest events. |
| IV. Ingest is a pipeline of stages | PASS | Alerts integrate exactly as the constitution prescribes: a registered post-ingest hook (`registerPostIngestHook(checkAlerts)`), not a pipeline modification. |
| V. Scraping | N/A here | Owned by [[005-scraping-ingest]]. |
| VI. Env-only config | PASS | `AUTH_SECRET`, SMTP creds, `NEXT_PUBLIC_SITE_URL` all from env. |
| VII. Simplicity first | PASS | No auth framework, no email queue — direct SMTP send with per-alert error isolation. |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-accounts-alerts/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/           # none — server actions only, no public HTTP API owned here
└── tasks.md
```

### Source Code (repository root)

```text
web/src/
├── lib/auth/
│   ├── user.ts        # registerUser (email validation, ≥8-char pw, bcrypt), verifyUser, changePassword
│   ├── session.ts     # createSession/destroySession/getSessionUserId — jose JWT httpOnly cookie
│   └── admin.ts       # isAdmin gating — owned by [[006-admin-operations]]
├── lib/alerts/
│   ├── hook.ts        # checkAlerts post-ingest hook: drop-only, target-met, 24h cooldown, lastFiredAt
│   └── email.ts       # sendAlertEmail via nodemailer/SMTP
└── app/[locale]/
    ├── account/page.tsx + actions.ts   # register/login/logout/favorites/alerts/change-password (thin)
    └── p/[slug]/actions.ts             # favorite/alert actions from the product page (thin)
```

**Structure Decision**: No new directories — documents existing `web/src/lib/auth/` +
`web/src/lib/alerts/` and their thin callers, per constitution I.

## Complexity Tracking

> Not applicable — no violations.
