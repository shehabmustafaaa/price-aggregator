# Price Aggregator — Competitor Analysis & Architecture Plan

## Context
Greenfield project in `P:\Programming\myProjects\price-aggregator` (empty dir). Goal: an Egypt-market price comparison site for home appliances, phones, and laptops, competing with **eg.pricena.com** and **moqrna.com**. This phase: competitive feature analysis, differentiation ideas, and tech stack/architecture decisions. Live analysis of both sites was performed (July 2026).

## 1. Competitor Feature Breakdown (verified live)

### Pricena (eg.pricena.com) — the mature benchmark
**Product page anatomy** (their core asset, tabs: Compare Prices / Reviews / Videos / Price Tracking / Specs / Ratings):
- **Offer list per product**: each merchant row shows store name, store rating, price, shipping cost, delivery estimate, stock status, "price updated X minutes ago" freshness stamp, deep "Go to Shop" affiliate link, "Report issue" link.
- **Best-price header**: "Best Price from N online shops — EGP X from Amazon EG (incl. shipping)".
- **Variant handling**: color/capacity variant selector ("See All Variations (12)"), each merchant offer tagged with its variant (256GB / Black) and "+N options".
- **Price alerts** ("Set price alert") + **Favorites/wishlist** (account-gated).
- **Price Tracking tab**: price-vs-time history charts.
- **Offer segmentation**: Online Shops / Nearby Shops / Used & Refurbished tabs.
- **Coupon integration**: bank/store promo codes shown inline on offers (e.g. "NBEJUL250 for 10% off with NBE cards").
- **Editorial reviews**: long-form SEO review text per flagship product ("Samsung Galaxy S25 Ultra price in Egypt" keyword targeting), related products, popular-in-category carousels.
**Site-wide**: category taxonomy (Mobiles > Mobile Phones > Samsung breadcrumbs), Price Drops section, Coupons & Offers section, "Great Deals Found" (biggest cross-store spreads), Arabic/English toggle, multi-country (UAE/KSA/Kuwait/Qatar), mobile apps, newsletter, "List Your Online Shop" merchant portal.
**Merchants covered**: Amazon EG, noon, Jumia, Raneen, Samsung, circuits, etc.
**Monetization**: affiliate CPC/CPA deep links, "featured"/Ad-labeled placements, merchant listing program.

### Moqrna (moqrna.com) — the narrower local player
- Appliance-focused taxonomy (ACs by horsepower 1.5–5HP, washers, fridges, TVs, small kitchen appliances).
- Search with category filter, product cards with price + star ratings, "Best Offers" section, stock indicators, "+X more" seller expansion.
- Wishlist, user accounts, blog for SEO, affiliate outbound model.
- **No visible price history, no price alerts, weaker spec filtering** — noticeably behind Pricena.

### Feature matrix takeaway
Table-stakes to launch: product/offer comparison list with shipping+stock+freshness, category taxonomy, search + spec/brand/price filters, variant grouping, wishlist, price alerts, price history charts, AR/EN i18n, SEO-heavy product pages. Pricena wins on data quality & freshness; Moqrna survives on appliance-niche SEO.

## 2. Value-Added Differentiators (recommended, roughly priority order)
1. **True total-cost ranking** — rank offers by price + shipping + applicable bank-card coupon (Egypt promos are heavily bank-tied; Pricena shows coupons but doesn't fold them into the ranking).
2. **Price-drop intelligence**: "is now a good time to buy?" badge from price history (current vs 90-day median), fake-discount detector for Black Friday–style inflated "was" prices.
3. **Instant alerts via WhatsApp/Telegram** (email open rates in Egypt are poor; Pricena is email/app only).
4. **Side-by-side spec comparison** of 2–4 products with per-spec highlighting (neither does this well).
5. **Installment comparison** — valU, Sympl, banks' installment plans normalized to monthly cost; huge for appliances in Egypt.
6. **Freshness transparency + user price reports** (crowdsourced corrections with small gamified incentive).
7. **API/embed widget** for tech blogs → backlinks + SEO.

## 3. Tech Stack & Architecture (recommendation)

### Stack
- **Frontend**: Next.js (App Router) — SSR/ISR is non-negotiable for SEO (this business is ~80% organic search); Tailwind; next-intl for AR (RTL) + EN.
- **Backend API**: ~~NestJS~~ **dropped (decided 2026-07-11)** — Next.js is the whole web app: server components query Prisma directly; route handlers (`app/api/...`) cover auth, alerts CRUD, scraper ingest (`/api/ingest`, shared-secret auth), and click tracking. Alert checks run at ingest time. A separate API service (NestJS/Fastify/FastAPI) only returns if a mobile app, public API, or heavy queue workers appear.
- **Database**: **PostgreSQL** — products/offers/price history relational core. Partition `price_history` by month (or use TimescaleDB hypertable).
- **Search**: **Meilisearch** to start (easy, great typo-tolerance incl. Arabic) → Elasticsearch/OpenSearch only if faceting needs outgrow it.
- **Cache/queues**: **Redis** + **BullMQ** for scraping job queues, alert dispatch, cache of hot product pages.
- **Scraping service**: separate **Python** service (Playwright + httpx/parsel; Crawlee-py or Scrapy) consuming jobs from the queue.

### Data pipeline architecture
```
Scheduler (cron per store, tiered frequency) 
  → Redis/BullMQ job queue (per-store queues, rate-limited)
  → Scraper workers (Playwright for JS-heavy: noon; plain HTTP for Amazon EG/Jumia sitemaps & pages; store APIs/feeds where available)
  → Raw offer staging table
  → Matching/normalization stage (map scraped offer → canonical product)
  → Offers + price_history upsert → triggers alert checks → notification queue
```
Key policies:
- **Tiered refresh**: hot products (flagships, high traffic) every 2–6h; long tail daily. Pricena shows "updated 46 min ago" on hot items — that's the bar.
- **Anti-blocking**: per-domain rate limits, rotating residential proxies, robots.txt respect where feasible, prefer sitemaps/JSON endpoints over HTML, exponential backoff, store adapters as isolated plugins so one store breaking doesn't stall the pipeline.
- **Product matching** is the hardest problem: GTIN/model-number exact match first → normalized title + brand + attribute fuzzy match (embeddings or trigram) → manual review queue for low-confidence matches.

### Core DB design (many-offers-to-one-product)
```
categories(id, parent_id, slug, name_en, name_ar)          -- adjacency/ltree hierarchy
brands(id, name, slug)
products(id, category_id, brand_id, model_number, gtin, slug, name_en, name_ar, specs jsonb, images)
product_variants(id, product_id, attrs jsonb)              -- color/capacity
stores(id, name, domain, logo, rating, affiliate_config)
offers(id, product_variant_id, store_id, url, price, shipping_cost, currency,
       in_stock, condition, coupon_code, last_seen_at, first_seen_at)
       UNIQUE(product_variant_id, store_id, url)
price_history(offer_id, price, shipping_cost, in_stock, recorded_at)  -- partitioned/Timescale
users(id, email, phone, channels)
price_alerts(id, user_id, product_id, target_price, channel, active)
favorites(user_id, product_id)
scrape_jobs / match_review_queue                            -- pipeline ops tables
```
Spec filtering: `specs jsonb` + GIN index, with a per-category `spec_definitions` table driving which facets render.

### Deployment & environments (decided 2026-07-11)
- **Backend**: no separate API service — Next.js route handlers + `lib/` functions (NestJS dropped, see Stack above).
- **Database now**: **native PostgreSQL 17.10 installed locally** (2026-07-11): service `postgresql-x64-17` on port 5432, install dir `C:\Program Files\PostgreSQL\17`, superuser `postgres`/`postgres`, database `price_aggregator` created, bin added to user PATH (shared server, one database per project). Dev URL: `postgresql://postgres:postgres@localhost:5432/price_aggregator`. Migration later to Postgres on the aaPanel server = connection-string change + `pg_dump`/restore.
- **Redis**: not covered by Supabase — use Upstash free tier or Redis on the aaPanel server; earliest phase can skip BullMQ and use `@nestjs/schedule` cron in-process.
- **Local dev machine**: Windows, Node 22 / Python 3.14 / git present, **no Docker** — hence the hosted-Postgres approach for now.
- **Production target**: Shehab's Linux server (aaPanel) running Postgres, Redis, API, Next.js, scraper workers; Cloudflare in front.

## 4. Product Scope (locked with Shehab, 2026-07-11)
- **Launch category: mobile phones only**, but the schema/taxonomy must be category-extensible from day one, and **store coverage is per-category** (a `category_stores` mapping / per-adapter category config), since future categories (appliances etc.) will scrape *different* websites.
- **Stores: start with ONE store — Dream2000 (dream2000.com)** (chosen by Shehab): local phone specialist, simpler site and weak anti-bot, good phone-only catalog to prove the pipeline. Then add Jumia/noon/Amazon EG in Phase 2.
- **V1 must-have features (all confirmed)**: compare + search + spec/brand/price filters; price-history collection from day one (charts UI can follow once data accrues); user accounts + wishlist + price-drop alerts; AR/EN bilingual from day one.
- **Monetization: none at first** — traffic/SEO first; affiliate links later. Still store outbound-click analytics from day one so affiliate conversion is a drop-in later.

## 5. Build Roadmap (revised after grilling session, 2026-07-11)
(Currently PLANNING ONLY — do not create code files until Shehab says start. Shehab is solo, near full-time.)

- **Phase 1 — private pipeline test (NOT a launch)**: Prisma schema (category-extensible, per-category store mapping, offer `version/warranty` attribute), Dream2000 adapter, `/api/ingest`, matching pipeline, price-history recording from day one, Next.js product/category/search pages, AR/EN. **Cut from Phase 1**: accounts, wishlist, alerts. Includes from day one: outbound-click tracking, staleness policy, scraper health checks.
- **Phase 2 — public launch.** Launch bar: **3+ stores** (add e.g. 2B/B.TECH/Jumia), phones, **email alerts** + accounts + wishlist, price-history charts UI (needs weeks of collected data — hence recording in Phase 1), PWA (installable, groundwork for push), SEO (sitemaps, `Product`/`Offer` structured data), Meilisearch if Postgres FTS proves insufficient.
- **Phase 3 — growth**: Telegram bot alerts (then WhatsApp — per-message cost + Meta approval), noon/Amazon EG adapters, more categories (appliances, laptops) with their own store sets, coupons/total-cost ranking, installment comparison, spec side-by-side, admin dashboard (match review + scraper health), monetization switch-on.

### Data-trust policy (self-defending, non-negotiable)
- Offers not re-verified within **24h are auto-hidden** (never show possibly-stale prices).
- Price sanity bounds at ingest: reject/flag jumps beyond a threshold (e.g. ±60% in one scrape) for review.
- Scraper health checks: minimum-expected-product-count per run, parse-error rate, failure notifications to Shehab.

### Distribution plan (first 6 months, pre-SEO)
- SEO compounds slowly (6–12 months vs Pricena's decade of authority) — treat as background investment, not the launch channel.
- Active channels: Egyptian tech Facebook groups & communities, price-drop content on social (TikTok/FB), and later a public **Telegram deals channel** broadcasting the best drops (doubles as alert infra).
- Alerts are the shareable hook — a friend forwarding "price dropped" beats a bookmark.

### Monetization (later, after traffic)
- Order: affiliate links (Amazon EG/noon programs) → Google AdSense banners → direct ad sales.
- Caveat: AdSense reviews "thin content" comparison sites harshly — the blog/editorial reviews also serve approval, not just SEO.
- Outbound-click tracking from day one so affiliate is a drop-in.

### Micro-features (Phase 2 backlog — cheap, high value)
- **"Report wrong price"** button on every offer (no login; one click + optional comment) — crowdsourced QA + trust signal.
- **Recently-viewed products** (localStorage, no accounts needed) — retention for multi-day research visits.
- **No-results search capture** — log searches with no matches; that queue drives which products/stores to add next.

### Explicitly rejected features (don't revisit until after public launch)
User reviews/ratings (moderation + empty at low traffic), forums/Q&A, native mobile app (PWA covers it), multi-country expansion (win Egypt first), AI shopping chatbot. Feature set is FROZEN — new ideas go to a post-launch backlog by default.

### Egypt-specific product modeling (from grilling)
- Same phone ≠ same offer: **official local warranty vs grey/imported, Middle East vs Global version** — offers carry a version/warranty attribute and the UI separates them. Pricena does this poorly → differentiator.

## 6. Phase 1 Future-Proofing Guardrails (binding rules for all code written)
These exist so Phase 2/3 features slot in without rewrites. Any Phase 1 code violating them is wrong even if it works.

**Schema (built complete in Phase 1, even where UI comes later):**
1. Full taxonomy from day one: `categories` (hierarchical) + `category_stores` mapping — adding appliances/laptops later = inserting rows, not migrating schema.
2. `offers.version/warranty` attribute (official vs imported, ME vs Global) present from the first migration.
3. `price_history` written from the very first scrape — Phase 2 charts need this backlog.
4. `outbound_clicks` table + redirect route (`/go/[offerId]`) from day one — affiliate later = changing the destination URL logic only.
5. `users`, `price_alerts`, `favorites` tables **defined in the schema** in Phase 1 (empty, no UI) — so Phase 2 auth is additive, not a migration risk.
6. All user-facing text fields bilingual (`name_en`/`name_ar`), never a single `name`.
7. Offer staleness fields (`last_seen_at`, `last_verified_at`) + every offer query goes through one shared `visibleOffers()` helper that enforces the 24h auto-hide rule — never raw `prisma.offer.findMany` in pages.

**Code structure (the NestJS-skip contract):**
8. ALL business logic in plain functions under `lib/` (`lib/catalog/`, `lib/pricing/`, `lib/ingest/`, `lib/alerts/`, `lib/tracking/`) — route handlers and server components are thin callers. This is what keeps a future API service / worker extraction mechanical.
9. Scraper adapters implement one interface (`fetch_products() -> list[RawOffer]` with per-store config: category map, rate limit, selectors) — store #2 is a new file, not a refactor. Adapter failures are isolated; one broken store never blocks ingest of others.
10. Ingest is a pipeline of stages (fetch → normalize → match → upsert → post-ingest hooks). Alert checking (Phase 2) and search-index sync (Meilisearch) register as **post-ingest hooks** — the pipeline doesn't change.
11. Notifications behind a channel interface (`sendAlert(user, payload, channel)`) — email first; Telegram/WhatsApp are new channel implementations, not new call sites.
12. Search behind one `searchProducts()` function backed by Postgres FTS — swapping to Meilisearch changes one module.
13. i18n via next-intl from the first page; no hardcoded strings. RTL-safe styling (Tailwind logical properties, `dir` from locale).
14. Every scrape run writes a `scrape_runs` health row (counts, errors, duration) — the Phase 3 dashboard reads what Phase 1 already recorded.
15. Config/secrets only via env vars (`DATABASE_URL`, `INGEST_SECRET`) — local → aaPanel deploy is env swap only.
16. Mobile-first responsive from the first component; PWA (Phase 2) must not require redesign.

## 7. Build Log & Ops Notes (Phase 1 executed 2026-07-11/12)
Phase 1 is BUILT and verified E2E. Also delivered beyond original scope: match-review admin
(`/admin/review?key=…`, grouped per product, auto-resolves once offers match), scraper control
plane (`/admin/scraper?key=…`: per-store enabled/interval/request-delay, Run now, jobs+runs audit),
Python daemon (`python main.py daemon`), color variants with per-color best price, image galleries,
dark theme (default), Arabic orthography normalization in the matcher (alef/hamza variants).

**Ops rules learned the hard way:**
- Run EXACTLY ONE daemon instance (pm2/systemd on the server). Multiple instances race job claims
  and orphan statuses. Stale RUNNING jobs (>30 min) auto-fail via claimNextJob self-heal.
- Always run the daemon with `python -u` and a log file; buffered output vanishes on kill.
- Dream2000 rate-limits products.json hard (429 even at 5s delay on page 2+); backoff honors
  Retry-After, and pagination stops when a page returns < limit.
- Matching precision requires digit-token + qualifier guards (A17≠A56, 16≠16 Pro) AND Arabic
  normalization; plain token overlap produced false matches. Catalog grows via review-approve →
  next scrape auto-attaches all variants of the approved product.

## Verification
- Pipeline: run a store adapter against 20 known products; assert offers land in `offers` with correct product matches and `price_history` rows accrue on price change.
- E2E: seed DB, `next build && next start`, check product page renders offers ranked by total cost, filters work, AR/RTL renders, Lighthouse SEO pass.
- Alerts: set alert above current price, force a price drop via test fixture, confirm notification job fires.
