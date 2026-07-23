# Status & Backlog

_Last updated: 2026-07-23_

## Current status

- **Production is LIVE**: https://shehabw1.space (aaPanel host, see DEPLOY.md + CLAUDE.md).
- Scraping automatically every ~3h on the server: **Dream2000** (~650 offers, Shopify API)
  and **B.TECH** (~20 offers, Playwright). **2B is hidden** — it 403-blocks datacenter IPs;
  re-enabling needs a home-PC run or an Egyptian residential proxy (~$5–10/mo).
- Speckit installed (`.specify/`, `/speckit-*` skills); constitution v1.0.0 ratified.
- No automated tests yet.

## Backlog (rough value-for-effort order)

1. ~~**Legal/static pages**~~ — **DONE 2026-07-23** (spec 007): Privacy, Terms, Contact
   (form + mailto fallback, `CONTACT_EMAIL` env) + footer links on every page. AdSense
   content prerequisite met; AdSense itself (account, ad units, ads.txt) remains future work.
2. **Missed-search admin view** — `MissedSearch` logging exists; needs a UI listing
   no-result queries to drive which products/stores to add. _Small._
3. **Duplicate-product detection & merge suggestions** — auto-created products from
   scrapers produce near-dupes; admin merge tool exists, suggestions don't. _Medium._
4. **Recently-viewed products** — localStorage, no accounts needed. _Small._
5. **Automated tests for ingest/matching** — matcher is the riskiest, most-tweaked
   code and has zero tests. _Medium._
6. **Spec side-by-side comparison** (2–4 products) — deferred by owner. _Large._
7. **Deeper B.TECH scrape** — category grid caps at top-20; expand via brand filters. _Medium._
8. **Editorial cleanup of auto-created product names** (nameEn=nameAr raw titles).
9. **2B via residential proxy** or scheduled home-PC runs.
10. **SEO polish** — deferred by owner ("seo will be later").

## Explicitly deferred by owner (don't propose until asked)

Spec comparison UI, installment comparison (valU/Sympl), Telegram/WhatsApp alerts,
user reviews, forums, native app, multi-country, AI chatbot.

## Known loose ends

- If `NEXT_PUBLIC_SITE_URL` changed in `web/.env` after the last server build,
  sitemap/robots point at localhost until the next `bash deploy.sh` + Node Project restart.
- 4G vs 5G variants with the same storage still merge into one variant (documented;
  deals.ts 45% cap is the backstop).
- A detached scraper daemon may exist on the Windows dev machine
  (log: `%TEMP%\scraper-daemon.log`) — only ONE daemon may run against a given DB.
