# Tasks: Legal & Static Pages

**Input**: Design documents from `/specs/007-legal-static-pages/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — manual verification via quickstart.md (project norm).

**Organization**: US1 = legal pages + footer (P1), US2 = contact page + form (P2).

## Phase 1: Setup

- [ ] T001 Add `CONTACT_EMAIL` to `web/.env` (local) and document it in `DEPLOY.md` env notes (value: owner's Gmail; falls back to existing SMTP identity if unset)

---

## Phase 2: Foundational

- [ ] T002 Add footer/link + contact-form message keys to `web/messages/ar.json` and `web/messages/en.json` (namespaces: `footer` — about/privacy/terms/contact labels; `contact` — form labels, success/invalid/rate-limited/send-failed strings)

**Checkpoint**: Labels available for both stories.

---

## Phase 3: User Story 1 - Read the legal pages (Priority: P1) 🎯 MVP

**Goal**: Privacy Policy and Terms pages, bilingual/RTL, About-page styling, footer links on
every page.

**Independent Test**: quickstart.md Scenarios 1–2 and 5 (Privacy/Terms only).

- [ ] T003 [P] [US1] Create Privacy Policy page (bilingual inline AR/EN content inside `LegalPage`, per FR-004 content list: accounts, favorites/alerts, click log, missed-search log, cookies, AdSense disclosure, privacy contact) in `web/src/app/[locale]/privacy/page.tsx`
- [ ] T004 [P] [US1] Create Terms of Service page (bilingual, per FR-005: price-accuracy disclaimer, not-the-seller, trademarks, acceptable use, liability limitation) in `web/src/app/[locale]/terms/page.tsx`
- [ ] T005 [US1] Extend the footer in `web/src/app/[locale]/layout.tsx` with locale-aware links to About / Privacy / Terms / Contact using the `footer` message keys (depends on T002; keeps © line; mobile-friendly wrap)

**Checkpoint**: Legal pages reachable from every page — AdSense content prerequisite met.

---

## Phase 4: User Story 2 - Contact the site owner (Priority: P2)

**Goal**: Contact page with working form (email delivery, validation, honeypot, rate limit)
plus mailto fallback.

**Independent Test**: quickstart.md Scenarios 3–4.

- [ ] T006 [US2] Implement `sendContactMessage()` in `web/src/lib/contact/send.ts`: validate (email format, message 1–5000 chars, name ≤100), honeypot fake-ok, in-memory per-IP rate limit (3/hour), nodemailer send to `CONTACT_EMAIL` with `replyTo` = visitor email; return `ok | invalid | rate_limited | send_failed` per contracts/pages-and-form.md
- [ ] T007 [P] [US2] Create `ContactForm` client component (name/email/message fields, visually-hidden `website` honeypot, localized success/error states, inputs preserved on error) in `web/src/components/ContactForm.tsx`
- [ ] T008 [US2] Create Contact page + server action: `web/src/app/[locale]/contact/page.tsx` (bilingual intro of contactable topics, `ContactForm`, mailto fallback link showing `CONTACT_EMAIL`) and `web/src/app/[locale]/contact/actions.ts` (thin: extract formData + IP, call `sendContactMessage`) (depends on T006, T007)

**Checkpoint**: Both stories complete and independently testable.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T009 Run quickstart.md Scenarios 1–5 in both locales (incl. mobile-width footer and crawlability curl check); fix anything found
- [ ] T010 Update `BACKLOG.md`: mark legal pages done; note AdSense next steps (account, ad units, ads.txt) remain future work

---

## Dependencies & Execution Order

- Phase 1 (T001) and Phase 2 (T002) first (T001 ∥ T002)
- US1: T003 ∥ T004 anytime; T005 after T002
- US2: T006 ∥ T007 after T001/T002; T008 after both
- US1 and US2 are independent of each other; Polish last

## Parallel Example

```text
After T002: launch T003, T004, T006, T007 in parallel (four different new files)
```

## Implementation Strategy

MVP = Phase 1–3 (legal pages + footer) — this alone satisfies the AdSense content
requirement. US2 (contact form) follows as an independent increment.
