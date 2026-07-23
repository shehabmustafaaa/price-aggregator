# Tasks: Automated Scraping & Ingest Pipeline

**Input**: Design documents from `/specs/005-scraping-ingest/`

**Status**: Baseline — tasks below reflect functionality already implemented and verified
against the running codebase on 2026-07-22; they are checked `[x]` for that reason.

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated test suite (`BACKLOG.md`); verification is quickstart.md.

**Organization**: Single P1 user story (spec.md has one story).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 `Store` scrape-config fields + `ScrapeJob`/`ScrapeRun`/`IngestEvent`/`MatchReview`/`AppSetting` models in `web/prisma/schema.prisma`
- [x] T002 [P] Scraper project scaffold (venv, httpx/parsel deps, optional Playwright) in `scraper/requirements.txt`, `scraper/requirements-browser.txt`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 Zod payload contract (`rawOfferSchema`/`ingestPayloadSchema`) in `web/src/lib/ingest/schema.ts`
- [x] T004 [P] Shared-secret auth on all three endpoints in `web/src/app/api/ingest/route.ts`, `web/src/app/api/scraper/claim/route.ts`, `web/src/app/api/scraper/complete/route.ts`
- [x] T005 [P] Post-ingest hook registry (`registerPostIngestHook`/`runPostIngestHooks`) in `web/src/lib/ingest/hooks.ts`

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Automated multi-store price collection (Priority: P1) 🎯 MVP

**Goal**: Continuous per-store scheduled collection with polite delays, correct
product/variant attachment, and full audit — resilient to blocks and bad data.

**Independent Test**: quickstart.md Scenarios 1–6.

### Control plane

- [x] T006 [US1] `claimNextJob` — stale-job self-heal (30 min), manual-PENDING-first, schedule keyed on last attempt of any status — in `web/src/lib/scraper/jobs.ts`
- [x] T007 [US1] `completeJob`/`requestRun` (deduped manual runs)/`updateStoreScrapeConfig` (clamps ≥15 min / ≥1 s) in `web/src/lib/scraper/jobs.ts`

### Ingest pipeline

- [x] T008 [US1] `ingest()` stage sequence + `ScrapeRun` health row + per-URL `IngestEvent` audit + 2-day pruning in `web/src/lib/ingest/pipeline.ts` (depends on T003, T005)
- [x] T009 [P] [US1] Accessory filter `isAccessory` in `web/src/lib/ingest/classify.ts`
- [x] T010 [P] [US1] ±60% price sanity `isPriceSane` (rejects audited + queued for review) in `web/src/lib/ingest/sanity.ts`
- [x] T011 [P] [US1] `matchOffer` — model-number first, guarded bilingual token overlap — in `web/src/lib/ingest/match.ts`
- [x] T012 [P] [US1] `autoCreateProduct` (toggle via `ingest.auto_approve` in `web/src/lib/settings.ts`) in `web/src/lib/ingest/autocreate.ts`
- [x] T013 [P] [US1] Storage-keyed `resolveVariant`/`variantConfig` in `web/src/lib/ingest/variant.ts`
- [x] T014 [US1] Offer upsert + `lastSeenAt` refresh + price-history append + image backfill (inside T008's pipeline) in `web/src/lib/ingest/pipeline.ts`

### Scraper service

- [x] T015 [US1] Daemon loop + CLI (`mock | <store> | daemon --poll N`) + `build_adapter` registry in `scraper/main.py` and `scraper/core/`
- [x] T016 [P] [US1] Dream2000 adapter (Shopify products.json) in `scraper/adapters/dream2000.py`
- [x] T017 [P] [US1] B.TECH adapter (Playwright/Chromium `--no-sandbox`) in `scraper/adapters/btech.py`
- [x] T018 [P] [US1] 2B adapter (Magento HTML; disabled in prod — IP block) in `scraper/adapters/twob.py`
- [x] T019 [P] [US1] Mock adapter with `--price-shift` for pipeline testing in `scraper/adapters/mock_store.py`

**Checkpoint**: Story functional and independently testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T020 systemd unit `asaar-scraper` + `deploy.sh` restart handling (prod runbook `DEPLOY.md`)
- [x] T021 Run quickstart.md Scenarios 1–7 to confirm baseline behavior

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T005) → Story (T006–T019; T008 blocks T014) →
  Polish (T020–T021)

## Implementation Strategy

Already delivered. Future work adds new phases below rather than editing the above.

---

## Phase 5: Convergence

- [x] T022 Fix stale docstring in `scraper/main.py` ("run under pm2/systemd") to say systemd only, per plan: production process model / Constitution Technology Constraints ("NO pm2") (contradicts, LOW — documentation only, no behavior change) — RESOLVED 2026-07-22: docstring now references systemd unit `asaar-scraper` only, plus the single-instance rule
