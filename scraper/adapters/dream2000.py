"""Dream2000 (dream2000.com) — Shopify store, scraped via the public
JSON API: /collections/<handle>/products.json. Polite: 1 req/2s."""

import re
import time

import httpx

from core.models import RawOffer, ScrapeResult

BASE = "https://dream2000.com"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) price-aggregator/0.1"
PAGE_LIMIT = 250
REQUEST_DELAY_S = 5.0
MAX_RETRIES = 5

# collection handle -> our canonical category slug
CATEGORY_MAP = {
    "mobiles": "mobile-phones",
}

# Brand names as they appear in Shopify `vendor` / titles.
KNOWN_BRANDS = {
    "samsung": "Samsung",
    "apple": "Apple",
    "iphone": "Apple",
    "xiaomi": "Xiaomi",
    "redmi": "Xiaomi",
    "oppo": "Oppo",
    "realme": "Realme",
    "honor": "Honor",
    "infinix": "Infinix",
    "vivo": "Vivo",
    "nokia": "Nokia",
    "tecno": "Tecno",
}

STORAGE_RE = re.compile(r"(?:التخزين|Storage)\s*:?\s*<[^>]*>*\s*(\d+)\s*(جيجابايت|تيرابايت|GB|TB)", re.IGNORECASE)
RAM_RE = re.compile(r"(?:الذاكرة|Ram)\s*:?\s*(?:<[^>]+>\s*)*(\d+)\s*(?:جيجابايت|GB)", re.IGNORECASE)


ARABIC_COLORS = [
    "أسود", "أبيض", "أزرق فاتح", "أزرق غامق", "أزرق", "أخضر غامق", "أخضر",
    "رمادي", "فضي", "ذهبي", "وردي", "زيتوني", "رملي", "بنفسجي", "أرجواني",
    "تيتانيوم", "أصفر", "أحمر", "برتقالي", "بيج", "نحاسي", "كحلي",
]


class Dream2000Adapter:
    store_slug = "dream2000"

    def __init__(self, request_delay_s: float | None = None):
        self.request_delay_s = request_delay_s or REQUEST_DELAY_S

    def scrape(self) -> list[ScrapeResult]:
        results = []
        with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=30) as client:
            for handle, category_slug in CATEGORY_MAP.items():
                results.append(self._scrape_collection(client, handle, category_slug))
        return results

    def _scrape_collection(
        self, client: httpx.Client, handle: str, category_slug: str
    ) -> ScrapeResult:
        offers: list[RawOffer] = []
        parse_errors = 0
        page = 1
        while True:
            url = f"{BASE}/collections/{handle}/products.json"
            resp = self._get_with_backoff(
                client, url, {"limit": PAGE_LIMIT, "page": page}
            )
            products = resp.json().get("products", [])
            if not products:
                break
            for product in products:
                try:
                    offers.extend(self._parse_product(product))
                except Exception:
                    parse_errors += 1
            # A short page means we've reached the end — don't request another.
            if len(products) < PAGE_LIMIT:
                break
            page += 1
            time.sleep(self.request_delay_s)
        return ScrapeResult(
            store_slug=self.store_slug,
            category_slug=category_slug,
            offers=offers,
            parse_errors=parse_errors,
        )

    def _get_with_backoff(
        self, client: httpx.Client, url: str, params: dict
    ) -> httpx.Response:
        delay = self.request_delay_s
        for attempt in range(MAX_RETRIES):
            resp = client.get(url, params=params)
            if resp.status_code != 429:
                resp.raise_for_status()
                return resp
            retry_after = float(resp.headers.get("Retry-After", delay))
            time.sleep(max(retry_after, delay))
            delay *= 2
        resp.raise_for_status()
        return resp

    def _parse_product(self, product: dict) -> list[RawOffer]:
        title = (product.get("title") or "").strip()
        handle = product["handle"]
        body_html = product.get("body_html") or ""
        vendor = (product.get("vendor") or "").strip()
        image_urls = [
            img["src"] for img in product.get("images", []) if img.get("src")
        ][:6]
        image_url = image_urls[0] if image_urls else None

        brand = self._detect_brand(vendor) or self._detect_brand(title)
        attrs = self._extract_attrs(body_html)

        offers = []
        for variant in product.get("variants", []):
            price = float(variant["price"])
            if price <= 0:
                continue
            variant_title = (variant.get("title") or "").strip()
            full_title = title if variant_title in ("", "Default Title") else f"{title} - {variant_title}"
            variant_attrs = dict(attrs)
            storage = self._storage_from_text(variant_title)
            if storage:
                variant_attrs["storage_gb"] = storage
            color = self._color_from_text(variant_title)
            if color:
                variant_attrs["color"] = color
            offers.append(
                RawOffer(
                    url=f"{BASE}/products/{handle}?variant={variant['id']}",
                    title=full_title,
                    price=price,
                    in_stock=bool(variant.get("available", True)),
                    brand=brand,
                    # Dream2000 is an official local retailer.
                    warranty_type="OFFICIAL_LOCAL",
                    attrs=variant_attrs,
                    image_url=image_url,
                    image_urls=image_urls,
                )
            )
        return offers

    def _detect_brand(self, text: str) -> str | None:
        lowered = text.lower()
        for key, brand in KNOWN_BRANDS.items():
            if key in lowered:
                return brand
        return None

    def _extract_attrs(self, body_html: str) -> dict:
        attrs: dict = {}
        storage = STORAGE_RE.search(body_html)
        if storage:
            value = int(storage.group(1))
            if storage.group(2).lower() in ("تيرابايت", "tb"):
                value *= 1024
            attrs["storage_gb"] = value
        ram = RAM_RE.search(body_html)
        if ram:
            attrs["ram_gb"] = int(ram.group(1))
        return attrs

    def _color_from_text(self, text: str) -> str | None:
        # Variant titles look like "أسود / 128 جيجابايت / 8 جيجابايت".
        for color in ARABIC_COLORS:  # longest names first in the list
            if color in text:
                return color
        return None

    def _storage_from_text(self, text: str) -> int | None:
        m = re.search(r"(\d+)\s*(GB|TB|جيجا|تيرا)", text, re.IGNORECASE)
        if not m:
            return None
        value = int(m.group(1))
        if m.group(2).lower() in ("tb", "تيرا"):
            value *= 1024
        return value
