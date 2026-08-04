"""B.TECH (btech.com) — Next.js SPA whose product grid renders client-side,
so this adapter drives headless Chromium (Playwright) with infinite scroll.

Card text shape (Arabic):
    0
    15,757 ج.م
    يبدأ من 1,081.11 ج.م /الشهر مع        <- optional installment line
    سامسونج
    سامسونج جالكسي A17 ، سعة 256 جيجا بايت ، رام 8 جيجا بايت ، ... - اسود
"""

import json
import re
import time
import urllib.parse

from core.models import RawOffer, ScrapeResult

BASE = "https://btech.com"

# B.TECH's mobiles category redirects to its search app; every grid (category,
# search, per-brand) hard-caps at ~20 items with no pagination or "load more".
# To get past 20 we harvest one brand at a time: the brand facet is reflected in
# a shareable search URL (…?q=…&filters={"brands":["<slug>"]}), so we build those
# URLs directly per brand and union the results. ~13 brands × up to 20 ≈ 200+
# unique phones vs. the single 20-item grid.
SEARCH_BASE = f"{BASE}/ar/s?q=mobiles+tablets+mobiles"

CATEGORY_MAP = {
    "mobiles-tablets/mobiles": "mobile-phones",
}

# B.TECH brand-facet slugs (English, lowercase) used in the filters= param,
# paired with the canonical brand label our ingest expects.
BRAND_SLUGS = {
    "apple": "Apple",
    "samsung": "Samsung",
    "xiaomi": "Xiaomi",
    "redmi": "Xiaomi",
    "oppo": "Oppo",
    "realme": "Realme",
    "honor": "Honor",
    "infinix": "Infinix",
    "vivo": "Vivo",
    "nokia": "Nokia",
    "tecno": "Tecno",
    "huawei": "Huawei",
    "oneplus": "OnePlus",
}

KNOWN_BRANDS = {
    "سامسونج": "Samsung",
    "ابل": "Apple",
    "ايفون": "Apple",
    "شاومي": "Xiaomi",
    "ريدمي": "Xiaomi",
    "اوبو": "Oppo",
    "ريلمي": "Realme",
    "هونر": "Honor",
    "انفنكس": "Infinix",
    "فيفو": "Vivo",
    "نوكيا": "Nokia",
    "تكنو": "Tecno",
    "هواوي": "Huawei",
}

PRICE_RE = re.compile(r"^([\d,]+(?:\.\d+)?)\s*ج\.م$")
STORAGE_RE = re.compile(r"سعة\s*([\d]+)\s*(جيجا|تيرا)")
RAM_RE = re.compile(r"رام\s*([\d]+)\s*جيجا")
MAX_SCROLLS = 25
SCROLL_PAUSE_S = 2.0
# Overall cap on unique listings harvested per run, so a full brand-by-brand
# sweep stays inside the scheduler's 30-min stale-job window and never floods.
MAX_ITEMS = 400


def _brand_url(slug: str) -> str:
    """Build the search URL filtered to a single brand facet."""
    filters = json.dumps({"brands": [slug]}, separators=(",", ":"))
    return f"{SEARCH_BASE}&filters={urllib.parse.quote(filters)}"


class BTechAdapter:
    store_slug = "btech"

    def __init__(self, request_delay_s: float | None = None):
        # For a browser adapter the delay paces scroll batches and, now, the
        # gap between brand-segment page loads.
        self.scroll_pause_s = request_delay_s or SCROLL_PAUSE_S

    def scrape(self) -> list[ScrapeResult]:
        from playwright.sync_api import sync_playwright

        results = []
        with sync_playwright() as p:
            # --no-sandbox is required when the daemon runs as root (systemd);
            # --disable-dev-shm-usage avoids crashes on servers with a small /dev/shm.
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            page = browser.new_page(
                locale="ar-EG",
                viewport={"width": 1366, "height": 900},
            )
            for path, category_slug in CATEGORY_MAP.items():
                results.append(self._scrape_category(page, path, category_slug))
            browser.close()
        return results

    def _scrape_category(self, page, path: str, category_slug: str) -> ScrapeResult:
        # Harvest one brand facet at a time (each capped at ~20 by B.TECH) and
        # union by product path, so total coverage is ~brands × 20 instead of a
        # single 20-item grid. If every brand segment yields nothing (e.g. the
        # filter scheme changed), fall back to the unfiltered search grid so
        # coverage never regresses below the original ~20.
        cards_by_key: dict[str, dict] = {}
        parse_errors = 0

        for i, slug in enumerate(BRAND_SLUGS):
            if len(cards_by_key) >= MAX_ITEMS:
                break
            if i > 0:
                # Pace brand-segment loads with the configured per-store delay.
                time.sleep(self.scroll_pause_s)
            try:
                for card in self._harvest_grid(page, _brand_url(slug)):
                    key = (card.get("href") or "").split("?")[0]  # ignore offering_id
                    if key and key not in cards_by_key:
                        cards_by_key[key] = card
                        if len(cards_by_key) >= MAX_ITEMS:
                            break
            except Exception:
                # One bad brand segment must never abort the whole run.
                parse_errors += 1
                continue

        if not cards_by_key:
            # Fallback: unfiltered search grid (the original ~20 behavior).
            try:
                for card in self._harvest_grid(page, SEARCH_BASE):
                    key = (card.get("href") or "").split("?")[0]
                    if key and key not in cards_by_key:
                        cards_by_key[key] = card
            except Exception:
                parse_errors += 1

        offers: list[RawOffer] = []
        for card in cards_by_key.values():
            try:
                offer = self._parse_card(card)
                if offer:
                    offers.append(offer)
            except Exception:
                parse_errors += 1

        return ScrapeResult(
            store_slug=self.store_slug,
            category_slug=category_slug,
            offers=offers,
            parse_errors=parse_errors,
        )

    def _harvest_grid(self, page, url: str) -> list[dict]:
        """Load a grid URL, infinite-scroll it, and return raw card dicts.
        This is the original single-grid harvesting logic, unchanged."""
        page.goto(url, wait_until="domcontentloaded", timeout=90000)
        page.wait_for_selector('a[href*="/p/"]', timeout=60000)

        # Infinite scroll until the card count stops growing. Scroll to the
        # absolute bottom (mouse.wheel doesn't reliably trigger the lazy
        # loader headless) and allow a few quiet checks before giving up.
        previous = page.locator('a[href*="/p/"]').count()
        quiet = 0
        for _ in range(MAX_SCROLLS):
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(self.scroll_pause_s)
            count = page.locator('a[href*="/p/"]').count()
            if count > previous:
                previous = count
                quiet = 0
            else:
                quiet += 1
                if quiet >= 3:
                    break

        return page.evaluate(
            """() => {
                const seen = new Set();
                const out = [];
                for (const a of document.querySelectorAll('a[href*="/p/"]')) {
                    const href = a.getAttribute('href');
                    if (!href || seen.has(href)) continue;
                    seen.add(href);
                    let card = a;
                    for (let k = 0; k < 6 && card && !card.innerText.includes('\\u062c.\\u0645'); k++) {
                        card = card.parentElement;
                    }
                    if (!card) continue;
                    const img = card.querySelector('img[src*="http"]');
                    out.push({ href, text: card.innerText, img: img ? img.src : null });
                }
                return out;
            }"""
        )

    def _parse_card(self, card: dict) -> RawOffer | None:
        lines = [ln.strip() for ln in card["text"].split("\n") if ln.strip()]
        price = None
        for line in lines:
            m = PRICE_RE.match(line)
            if m:
                price = float(m.group(1).replace(",", ""))
                break
        if not price or price <= 0:
            return None

        # Title = longest line containing "،" or just the longest line.
        title = max(lines, key=len)
        if len(title) < 10:
            return None

        attrs: dict = {}
        storage = STORAGE_RE.search(title)
        if storage:
            value = int(storage.group(1))
            if storage.group(2) == "تيرا":
                value *= 1024
            attrs["storage_gb"] = value
        ram = RAM_RE.search(title)
        if ram:
            attrs["ram_gb"] = int(ram.group(1))
        if " - " in title:
            color = title.rsplit(" - ", 1)[1].strip()
            if color and len(color) < 30:
                attrs["color"] = color

        url = card["href"]
        if url.startswith("/"):
            url = f"{BASE}{url}"

        return RawOffer(
            url=url,
            title=title,
            price=price,
            in_stock=True,  # listing shows available items; PDP-level stock is a later refinement
            brand=self._detect_brand(title),
            warranty_type="OFFICIAL_LOCAL",
            attrs=attrs,
            image_url=card.get("img"),
            image_urls=[card["img"]] if card.get("img") else [],
        )

    def _detect_brand(self, text: str) -> str | None:
        normalized = (
            text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").lower()
        )
        for key, brand in KNOWN_BRANDS.items():
            if key in normalized:
                return brand
        return None
