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
2. ~~**Missed-search admin view**~~ — **DONE 2026-08-02** (spec 008): admin-only
   `/admin/missed-searches` — read-only ranked list of zero-result queries aggregated by
   normalized term (count, locale(s), last-searched) + dismiss. No catalog/scraper writes.
3. ~~**Duplicate-product detection & merge suggestions**~~ — **DONE 2026-08-02** (spec 009):
   admin-only `/admin/catalog/duplicates` — ranked same-category likely-dupe pairs (reusing
   the ingest matcher's similarity primitives, now shared in `lib/ingest/similarity.ts`),
   one-click merge into the existing merge tool + persistent "not a duplicate" dismiss
   (`duplicate_dismissals`). Also chips away at item #8 (auto-created name dupes).
4. ~~**Recently-viewed products**~~ — **DONE 2026-08-02** (spec 010): device-only
   localStorage strip (no account/server), shown on product + home pages; records on view,
   dedupes to front, capped at 12, bilingual/RTL, no price (links to the live product page).
5. ~~**Automated tests for ingest/matching**~~ — **DONE 2026-08-02** (spec 011): Vitest unit
   suite (`web/`, `npm test`) over the pure logic — price sanity, accessory filter, colour
   canonicalization, Arabic text normalization, similarity primitives + duplicate scoring,
   variant config (31 tests, no DB). Follow-on: DB-integration tests for `matchOffer`/
   `resolveVariant`/`pipeline`.
6. **Spec side-by-side comparison** (2–4 products) — deferred by owner. _Large._
7. ~~**Deeper B.TECH scrape**~~ — **DONE 2026-08-04** (spec 012): B.TECH hard-caps every grid
   at ~20 (no pagination/API; brand facets are JS buttons), but applying a brand facet yields a
   shareable `…&filters={"brands":["slug"]}` search URL. Adapter now harvests per brand slug and
   unions by product path → **218 offers** live (vs 20). Per-brand still caps at 20, so very
   large brands (Samsung/Xiaomi) are truncated — future refinement could add a second facet.
8. ~~**Editorial cleanup of auto-created product names**~~ — **DONE 2026-08-04** (spec 013):
   admin-only `/admin/catalog/needs-names` lists products whose English name still contains
   Arabic (the auto-create signature), inline-edit nameEn/nameAr/slug; a row drops off once the
   English name is Latin (no extra state). Reuses `updateProduct`; linked from the catalog page.
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
