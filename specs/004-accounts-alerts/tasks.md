# Tasks: Accounts, Favorites & Price Alerts

**Input**: Design documents from `/specs/004-accounts-alerts/`

**Status**: Baseline — tasks below reflect functionality already implemented and verified
against the running codebase on 2026-07-22; they are checked `[x]` for that reason.

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: No automated test suite (`BACKLOG.md`); verification is quickstart.md.

**Organization**: Single P3 user story (spec.md has one story).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 `User`/`Favorite`/`PriceAlert` models + `AlertChannel` enum in `web/prisma/schema.prisma`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 jose JWT session (create/destroy/read, httpOnly cookie, 30d) in `web/src/lib/auth/session.ts`
- [x] T003 [P] `registerUser`/`verifyUser`/`changePassword` (bcrypt, validation) in `web/src/lib/auth/user.ts`

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Track a product (Priority: P3)

**Goal**: Account creation, favorites, target-price email alerts, self-serve password change.

**Independent Test**: quickstart.md Scenarios 1–3.

### Implementation for User Story 1

- [x] T004 [US1] Account page + server actions (register/login/logout/favorites/alerts/password) in `web/src/app/[locale]/account/page.tsx` and `actions.ts` (depends on T002, T003)
- [x] T005 [P] [US1] Favorite/alert actions from product page in `web/src/app/[locale]/p/[slug]/actions.ts`
- [x] T006 [US1] `checkAlerts` post-ingest hook (drop-only, target-met, 24h cooldown, lastFiredAt) in `web/src/lib/alerts/hook.ts`
- [x] T007 [P] [US1] `sendAlertEmail` via nodemailer/SMTP with per-alert failure isolation in `web/src/lib/alerts/email.ts`
- [x] T008 [US1] Bilingual alert email composition per `user.locale` in `web/src/lib/alerts/hook.ts`

**Checkpoint**: Story functional and independently testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T009 Run quickstart.md Scenarios 1–4 to confirm baseline behavior

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T003) → Story (T004–T008) → Polish (T009)

## Implementation Strategy

Already delivered. Future work adds new phases below rather than editing the above.

---

## Phase 5: Convergence

- [x] T010 Reconcile spec.md US1/AC2 ("the alert deactivates" after firing) with the built behavior in `web/src/lib/alerts/hook.ts` (alert stays `active`, 24h re-fire cooldown via `lastFiredAt`) per US1/AC2 (contradicts) — RESOLVED 2026-07-22: spec amended (AC2 + FR-003) to match the built cooldown behavior; code unchanged
