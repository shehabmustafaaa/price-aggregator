# Phase 0 Research: Accounts, Favorites & Price Alerts

**Status**: Baseline — verified against `web/src/lib/auth/{user,session}.ts` and
`web/src/lib/alerts/{hook,email}.ts`. No `NEEDS CLARIFICATION` markers.

## Decision: Custom jose-JWT + bcryptjs auth, not NextAuth

- **Decision**: Sessions are a self-issued HS256 JWT (`sub` = userId) in an httpOnly `session`
  cookie (30-day expiry); passwords are bcrypt-hashed (cost 10) with a ≥8-char minimum.
- **Rationale**: The site needs exactly email/password + an `isAdmin` flag; NextAuth's
  provider/adapter machinery adds surface area with no benefit at this scope (constitution
  VII), and constitution's Technology Constraints codify the custom approach.
- **Alternatives considered**: NextAuth was rejected as heavier than the requirement;
  DB-backed session rows were rejected — a signed JWT avoids a session table with no revocation
  requirement beyond expiry at current scope.

## Decision: Alerts are a post-ingest hook with drop-only firing and a 24h cooldown

- **Decision**: `checkAlerts` registers via `registerPostIngestHook` and receives per-ingest
  `PriceChangeEvent`s. It skips non-drops (`oldPrice !== null && newPrice >= oldPrice`), then
  matches `active` alerts with `targetPrice >= newPrice` whose `lastFiredAt` is null or older
  than 24h (`REFIRE_COOLDOWN_H`), emails them, and stamps `lastFiredAt`.
- **Rationale**: Constitution IV — new side effects register as hooks; the pipeline itself
  never changes. Drop-only firing prevents alert spam on unchanged/rising prices; the cooldown
  prevents repeat emails when every scrape cycle re-confirms the same low price.
- **Alternatives considered**: A scheduled sweep ("check all alerts every N minutes") was
  rejected — event-driven firing off ingest is both cheaper and faster (SC-001: within one
  scrape cycle), and can never fire off stale data because it only sees just-ingested prices.
- **Note on spec.md AC2 ("the alert deactivates")**: the implementation uses `lastFiredAt` +
  24h cooldown rather than flipping `active = false`. Effect for the user: they keep getting
  at most one email per day while the price stays at/below target, instead of exactly one
  email ever. This is a deliberate behavioral difference recorded here (see converge notes).

## Decision: Email failures are isolated per alert

- **Decision**: `sendAlertEmail` failures are caught, logged, and skipped — the loop continues
  to the next alert and the ingest pipeline is never failed by an email problem.
- **Rationale**: One unreachable mailbox must not block price ingestion or other users'
  alerts (constitution IV: hooks must not break the pipeline).

## Open questions

None — baseline of already-built behavior. The AC2 deactivate-vs-cooldown nuance is handled
in tasks.md convergence rather than left open.
