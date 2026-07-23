# Phase 1 Data Model: Legal & Static Pages

No new database entities — legal pages are static content and contact submissions are
emailed, never stored (spec Assumptions).

## Transient shapes (not persisted)

### ContactMessage (in-memory, per submission)

| Field | Rules |
|---|---|
| `name` | optional, trimmed, ≤100 chars |
| `email` | required, valid email format (same regex family as `lib/auth/user.ts`) |
| `message` | required, trimmed, 1–5000 chars |
| `website` (honeypot) | must be empty; non-empty ⇒ silently drop (fake success) |
| `locale` | "ar" \| "en" — selects response-message language only |

Delivered as an email to `CONTACT_EMAIL` with `replyTo: email`; subject prefixed
`[Asaar contact]`.

### Rate-limit state (in-memory, per process)

`Map<ip, timestamp[]>` — keep timestamps within the last hour; reject when count ≥ 3.
Reset on process restart (acceptable; only loosens the limit).

## Configuration

| Key | Source | Notes |
|---|---|---|
| `CONTACT_EMAIL` | `web/.env` | published address + form recipient; defaults to existing SMTP identity |
| SMTP settings | `web/.env` (existing) | reused from the price-alert email path |
