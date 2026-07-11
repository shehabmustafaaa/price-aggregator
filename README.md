# Price Aggregator

Egypt-market price comparison site (phones first). See [PLAN.md](PLAN.md) for the full
plan, feature scope, and the Phase 1 future-proofing guardrails all code must follow.

## Layout
- `web/` — Next.js app (frontend + server components + API route handlers + Prisma). The whole web app; there is no separate API service.
- `scraper/` — Python scraper service. One adapter per store; POSTs results to `web`'s `/api/ingest`.

## Local dev
Prereqs: Node 22+, Python 3.12+, local PostgreSQL with a `price_aggregator` database.

```bash
# web
cd web
npm install
npx prisma migrate dev     # applies migrations (DATABASE_URL in web/.env)
npx tsx prisma/seed.ts     # seed category/brands/stores/starter products
npm run dev                # http://localhost:3000 (/, /ar, /en)

# scraper (separate terminal)
cd scraper
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
copy .env.example .env     # INGEST_URL + INGEST_SECRET (must match web/.env)
.venv/Scripts/python main.py mock        # end-to-end pipeline test with fake data
.venv/Scripts/python main.py dream2000   # real scrape of dream2000.com
```

## Key invariants (see PLAN.md §6 for all 16)
- Offers not re-verified within 24h are auto-hidden (`lib/catalog/offers.ts` is the only gate).
- Every scrape writes a `scrape_runs` health row; absurd price jumps are rejected to `match_review_queue`.
- All business logic lives in `web/src/lib/**`; routes and pages are thin callers.
- All user-facing text is bilingual (ar/en) via next-intl; never hardcode strings.
