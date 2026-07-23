# Phase 1 Data Model: Accounts, Favorites & Price Alerts

**Status**: Baseline — reflects `web/prisma/schema.prisma` as built.

## Entities in scope

### User

`email` (unique, lowercased/trimmed at registration), `passwordHash` (bcrypt, nullable),
`phone` (unused today), `locale` (default "ar" — drives alert-email language), `isAdmin`
(consumed by [[006-admin-operations]]).

- **Invariant**: registration enforces email-format regex and ≥8-char password; email
  uniqueness enforced at both app and DB level.

### Favorite

Composite-PK join (`userId`, `productId`) with `createdAt`. No extra state — a favorite either
exists or doesn't.

### PriceAlert

`userId`, `productId`, `targetPrice` (Decimal 12,2), `channel` (enum: EMAIL live;
TELEGRAM/WHATSAPP/WEB_PUSH reserved), `active`, `lastFiredAt`.

- **Firing invariant** (as built): fires only when a *just-ingested* price drop (or first
  sighting) satisfies `targetPrice >= newPrice`, alert is `active`, and `lastFiredAt` is null
  or >24h old. On fire: email sent, `lastFiredAt` stamped. `active` is NOT auto-flipped —
  see research.md note on the spec-AC2 difference.
- Indexed on `(productId, active)` for the hook's lookup.

## State transitions

- `PriceAlert.lastFiredAt`: null → timestamp on first fire; refreshed on each re-fire (≥24h
  apart) while price stays at/below target.
- `PriceAlert.active`: toggled only by the user (create/disable), never by the system.
- `User.passwordHash`: replaced atomically on self-serve change after verifying the current
  password; old password stops working immediately (next `verifyUser` compares against the
  new hash).
