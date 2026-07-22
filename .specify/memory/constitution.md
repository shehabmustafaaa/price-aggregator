<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: all placeholders filled (initial ratification)
- Added sections: Core Principles (7), Technology Constraints, Development Workflow, Governance
- Removed sections: none
- Templates requiring updates:
  ✅ .specify/templates/plan-template.md (generic Constitution Check gate — compatible as-is)
  ✅ .specify/templates/spec-template.md (no constitution-specific tokens — compatible)
  ✅ .specify/templates/tasks-template.md (no constitution-specific tokens — compatible)
- Follow-up TODOs: none
-->

# Asaar Constitution

Asaar (أسعار) is an Egypt-market price-comparison website (phones first, category-extensible
to appliances/laptops), competing with eg.pricena.com and moqrna.com. Production runs at
https://shehabw1.space on an aaPanel Linux host.

## Core Principles

### I. Business Logic Lives in `lib/`

All business logic MUST be plain functions under `web/src/lib/` (`catalog/`, `ingest/`,
`scraper/`, `auth/`, `alerts/`, `tracking/`). Route handlers, server actions, and server
components are thin callers only. Rationale: keeps a future API-service or worker extraction
mechanical, and keeps logic testable without HTTP.

### II. Bilingual by Construction (AR/EN, RTL)

Every user-facing text field is stored bilingual (`nameEn`/`nameAr`, `descriptionEn`/
`descriptionAr`) — never a single `name`. All UI strings go through next-intl message files;
hardcoded strings are defects. Styling MUST be RTL-safe (Tailwind logical properties, `dir`
from locale). Arabic text handling MUST normalize orthography (alef variants, Arabic digits)
wherever text is matched or searched.

### III. Data Trust Is Non-Negotiable

Users MUST never see stale or implausible prices:
- Offers not re-seen within 24h are auto-hidden; every offer query goes through the shared
  `freshOfferWhere` helper — never a raw `prisma.offer.findMany` in pages.
- Ingest rejects price jumps beyond ±60% (sanity bounds) and records the rejection.
- Every scrape run writes a `scrape_runs` health row and per-URL `IngestEvent` audit rows.
- Deal/discount surfaces cap implausible spreads (45% plausibility backstop).

### IV. Ingest Is a Pipeline of Stages

Ingest flows fetch → normalize → match → resolve variant → upsert → post-ingest hooks. New
side effects (alerts, search-index sync) register as post-ingest hooks; the pipeline itself
does not change. Scraper adapters implement one interface (`scrape() -> list[ScrapeResult]`)
with per-store config; a new store is a new adapter file, never a refactor. One broken store
MUST NOT block ingest of others.

### V. Scrape Politely, Survive Blocks

Adapters respect per-store `requestDelaySeconds` and back off on 429/403. The scheduler keys
"due" on the last attempt (any status), so failing stores back off a full interval instead of
flooding. Exactly ONE scraper daemon instance runs at a time (multiple daemons race and
orphan jobs). Prefer store APIs/JSON endpoints over HTML when available.

### VI. Category-Extensible Schema, Env-Only Config

The schema stays category-extensible: hierarchical categories, per-category store mapping,
variant `attrs` jsonb, offers carrying warranty/version attributes (Egypt grey market).
Adding a category is inserting rows, not migrating schema. All host/environment specifics
(DB URL, secrets, domain) come exclusively from env vars in gitignored `.env` files —
nothing host-specific is ever hardcoded or committed. `NEXT_PUBLIC_*` values are baked at
build time and require a rebuild to change.

### VII. Simplicity First (YAGNI)

No new services, queues, or infrastructure until a concrete need exists (this is why NestJS,
Redis/BullMQ, Meilisearch, and Docker were deferred). New feature ideas default to the
post-launch backlog; the active feature set changes deliberately, not opportunistically.

## Technology Constraints

- Web: Next.js 16 App Router (note: `proxy.ts`, not `middleware.ts`) + React 19 + Tailwind +
  next-intl. Prisma 7 with driver adapters (`@prisma/adapter-pg`), generated client at
  `web/src/generated/prisma`.
- DB: PostgreSQL (local dev `price_aggregator`; prod `asaardb`). Schema changes ONLY via
  Prisma migrations (`prisma migrate dev` locally, `prisma migrate deploy` in prod).
- Auth: custom jose JWT session + bcryptjs (`isAdmin` flag) — NOT NextAuth.
- Scraper: separate Python 3.12 service (httpx/parsel; Playwright only for SPA stores),
  decoupled from the web app — it POSTs to `/api/ingest` with `x-ingest-secret`.
- Production process model: aaPanel Node Project (web, port 3000) + systemd `asaar-scraper`
  (daemon) + aaPanel Nginx/SSL. NO pm2. Deploys use `deploy.sh` from the repo root.

## Development Workflow

- Dev happens on Windows (no Docker); production is Linux — never commit platform-built
  artifacts (`node_modules/`, `.next/`, `.venv/`, generated Prisma client).
- Never commit `.env` files or DB dumps; they are gitignored and preserved across deploys.
- Test after a batch of related features, not after every micro-change (owner's preference).
- Verify scraping/ingest changes end-to-end: run the adapter, check `/admin/scraper` run
  audit, confirm offers/price-history rows land correctly.
- Shell scripts MUST be LF (`.gitattributes` enforces) so they run on the Linux host.

## Governance

This constitution supersedes ad-hoc practice. Every speckit plan MUST pass a Constitution
Check against the principles above; violations require explicit justification in the plan's
Complexity Tracking section or the plan is rewritten. Amendments happen by editing this file
with a semantic version bump (MAJOR: principle removal/redefinition; MINOR: new principle or
material expansion; PATCH: clarification) and updating dependent templates in the same
change. The project owner (Shehab, solo developer) is the sole approver.

**Version**: 1.0.0 | **Ratified**: 2026-07-22 | **Last Amended**: 2026-07-22
