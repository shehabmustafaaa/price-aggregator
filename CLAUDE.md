# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Asaar (أسعار) — Egypt-market price-comparison site (mobile phones first, category-extensible).
Two independent services: `web/` (Next.js — the entire web app, no separate API service) and
`scraper/` (Python — scrapes stores, POSTs to the web app's `/api/ingest`). Full plan and the
binding guardrails live in `PLAN.md` (§6); project principles in `.specify/memory/constitution.md`;
current status and the agreed feature backlog in `BACKLOG.md` (update it when work lands).

## Commands

```bash
# web (Node 22+, local PostgreSQL db `price_aggregator`)
cd web
npm install
npx prisma migrate dev        # apply migrations (DATABASE_URL in web/.env)
npx tsx prisma/seed.ts        # seed categories/brands/stores
npm run dev                   # http://localhost:3000 (/ar default, /en)
npm run build                 # rm -rf .next first if a dev server was running (routes.d.ts corruption)
npm run lint

# one-off maintenance scripts (web/scripts/): run with npx tsx, e.g.
npx tsx scripts/make-admin.ts <email> [password]
npx tsx scripts/rebuild-variants.ts    # re-resolve offers→variants after matcher changes

# scraper (Python 3.12+, Windows paths shown; Linux uses .venv/bin/)
cd scraper
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/pip install -r requirements-browser.txt   # only for B.TECH (Playwright)
.venv/Scripts/python main.py mock        # end-to-end pipeline test with fake data
.venv/Scripts/python main.py dream2000   # one real scrape
.venv/Scripts/python main.py daemon --poll 30   # poll /api/scraper/claim — ONE instance only
```

There are no automated tests yet. Verify ingest/matching changes by running an adapter and
checking the per-URL audit at `/admin/scraper` → run detail.

## Version gotchas (do not skip)

- **Next.js 16**: NOT the Next.js in training data — read `web/node_modules/next/dist/docs/`
  before writing framework-touching code. `proxy.ts` replaces `middleware.ts`.
- **Prisma 7**: driver adapters — `new PrismaClient({ adapter: new PrismaPg(...) })` is
  required (`web/src/lib/db.ts`); config in `prisma.config.ts`; generated client is at
  `web/src/generated/prisma` (never edit, never commit).
- **Auth is custom** (jose JWT cookie + bcryptjs, `User.isAdmin`) — NOT NextAuth. Admin
  gating via `lib/auth/admin.ts` `requireAdmin`/`getAdminUser`.
- `NEXT_PUBLIC_*` env vars are baked at **build** time.
- `.env` files (web/, scraper/) are gitignored and hold all host config — never commit them,
  never hardcode host specifics. `INGEST_SECRET` must match between the two.

## Architecture

**Data flow**: scraper adapter → POST `/api/ingest` (x-ingest-secret) →
`lib/ingest/pipeline.ts`: normalize (colors via `lib/catalog/colors.ts` canonicalColor) →
accessory filter (`classify.ts`) → price sanity ±60% (`sanity.ts`) → match to product
(`match.ts`: model-number first, then bilingual token overlap with digit-token + qualifier +
Arabic-orthography guards) → unmatched offers auto-create products (`autocreate.ts`, toggle
in `/admin/scraper`) or go to the review queue → `variant.ts` resolveVariant (keyed on
**storage only**; RAM/network are informational attrs) → upsert offer + price history →
post-ingest hooks (`hooks.ts`, e.g. price alerts). Every URL gets an `IngestEvent` audit row
(pruned after 2 days); every run writes a `scrape_runs` health row.

**Data trust invariants**: offers unseen >24h are hidden — ALL offer queries go through
`freshOfferWhere` in `lib/catalog/offers.ts`, never raw `prisma.offer.findMany` in pages.
Deal surfaces (`lib/catalog/deals.ts`) cap spreads at 45% as a plausibility backstop.

**Scraper control plane**: web owns scheduling. Daemon polls `/api/scraper/claim` →
`lib/scraper/jobs.ts` claimNextJob (manual PENDING jobs first, then per-store schedule keyed
on **last attempt of any status** so failing stores back off instead of flooding) → runs the
adapter → `/api/scraper/complete`. Per-store interval/delay/enabled configured in
`/admin/scraper`. Adapters (`scraper/adapters/`) implement `scrape() -> list[ScrapeResult]`;
a new store = a new adapter file registered in `main.py` build_adapter. Dream2000 = Shopify
products.json API; B.TECH = Playwright/Chromium (launched --no-sandbox for root); 2B =
Magento HTML but blocks datacenter IPs (disabled in prod).

**Web app conventions**: all business logic is plain functions under `web/src/lib/`
(catalog/ ingest/ scraper/ auth/ alerts/ admin/ tracking/) — route handlers, server actions,
and server components are thin callers. i18n via next-intl (`[locale]` routes, AR default,
RTL); every user-facing DB text field is bilingual (`nameEn`/`nameAr`). Arabic matching/search
normalizes orthography (alef variants) — see `lib/text.ts` and `match.ts`. Admin forms use
redirect-after-POST (`?saved=1`) to avoid resubmission prompts.

## Production

Live at https://shehabw1.space — aaPanel Linux host, project root `/www/wwwroot/shehabw1`.
Process model: aaPanel **Node Project** runs web (port 3000); **systemd `asaar-scraper`**
runs the daemon; aaPanel Nginx reverse-proxy + SSL. NO pm2. Deploy = push to master, then on
the server `bash deploy.sh` (rebuilds, migrates, chowns, restarts scraper) + restart the
Node Project in the aaPanel UI. Runbook: `DEPLOY.md`. Shell scripts must stay LF
(`.gitattributes` enforces).
