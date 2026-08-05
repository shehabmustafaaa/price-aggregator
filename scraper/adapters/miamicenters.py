"""Miami Centers (miamicenters.com) — WooCommerce store, scraped via the public
Store API: /wp-json/wc/store/v1/products?category=<id>&page=<n>&per_page=100.
No auth, no browser. Polite: 1 req/2s with 429 backoff.

Phones live under two category trees (the Store API `category` filter is
recursive):
  58 = "mobile"    — Android brands (Samsung, Honor, Vivo, Oppo, Xiaomi, …)
  91 = "iphone-2"  — the actual iPhone phones (tagged 'appleproducts')
(Category 109 is the Apple umbrella but is ENTIRELY covers/accessories, so it
is deliberately NOT scraped; the accessory-slug filter is a second net.)

Products are mostly "simple" (each colour/config is its own product id), so one
offer per product. Prices are whole EGP (currency_minor_unit: 0). Titles embed
specs, e.g. "HONOR MAGIC V5 512/16GB 5G WHITE G", "Vivo Y500 256/6GB BLUE G".
"""

import re
import time

import httpx

from core.models import RawOffer, ScrapeResult

BASE = "https://miamicenters.com"
API = f"{BASE}/wp-json/wc/store/v1/products"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) price-aggregator/0.1"
PER_PAGE = 100
REQUEST_DELAY_S = 2.0
MAX_RETRIES = 5

# WooCommerce phone category trees (recursive) → our canonical category slug.
PHONE_CATEGORY_IDS = [58, 91]
CATEGORY_SLUG = "mobile-phones"

# A product carrying any of these markers in its category slugs is an accessory
# or non-phone (covers, cases, wearables, tablets, laptops, power banks,
# appliances…) — skip it. The web-side title classifier is a second net.
ACCESSORY_MARKERS = (
    "cover", "case", "accessor", "wearable", "tablet", "watch", "airpod",
    "powerbank", "power-bank", "charger", "cable", "screen", "mac", "ipad",
    "laptop", "scooter", "airfryer", "iron", "mixer", "smart", "band",
)

# Brand by category slug (checked first) or title token.
KNOWN_BRANDS = {
    "samsung": "Samsung",
    "iphone": "Apple",
    "apple": "Apple",
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
    "motorola": "Motorola",
    "nothing": "Nothing",
    "oneplus": "OnePlus",
}

# Android: "256/6GB", "512 / 16 GB" → (storage, ram)
SPEC_RE = re.compile(r"(\d+)\s*/\s*(\d+)\s*GB", re.IGNORECASE)
# iPhones list storage only: "512GB", "1TB", "256 GB"
STORAGE_ONLY_RE = re.compile(r"(\d+)\s*(TB|GB)\b", re.IGNORECASE)
NETWORK_RE = re.compile(r"\b(5G|4G|LTE)\b", re.IGNORECASE)


class MiamiCentersAdapter:
    store_slug = "miamicenters"

    def __init__(self, request_delay_s: float | None = None):
        self.request_delay_s = request_delay_s or REQUEST_DELAY_S

    def scrape(self) -> list[ScrapeResult]:
        offers: list[RawOffer] = []
        parse_errors = 0
        seen: set[int] = set()
        with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=30) as client:
            for category_id in PHONE_CATEGORY_IDS:
                try:
                    cat_offers, cat_errors = self._scrape_category(client, category_id, seen)
                    offers.extend(cat_offers)
                    parse_errors += cat_errors
                except Exception:
                    # One bad category tree must not abort the whole run.
                    parse_errors += 1
        return [
            ScrapeResult(
                store_slug=self.store_slug,
                category_slug=CATEGORY_SLUG,
                offers=offers,
                parse_errors=parse_errors,
            )
        ]

    def _scrape_category(
        self, client: httpx.Client, category_id: int, seen: set[int]
    ) -> tuple[list[RawOffer], int]:
        offers: list[RawOffer] = []
        parse_errors = 0
        page = 1
        while True:
            resp = self._get_with_backoff(
                client,
                {"category": category_id, "per_page": PER_PAGE, "page": page},
            )
            products = resp.json()
            if not isinstance(products, list) or not products:
                break
            for product in products:
                try:
                    pid = product.get("id")
                    if pid in seen:
                        continue
                    if self._is_accessory(product):
                        continue
                    offer = self._parse_product(product)
                    if offer:
                        seen.add(pid)
                        offers.append(offer)
                except Exception:
                    parse_errors += 1
            if len(products) < PER_PAGE:
                break
            page += 1
            time.sleep(self.request_delay_s)
        return offers, parse_errors

    def _get_with_backoff(self, client: httpx.Client, params: dict) -> httpx.Response:
        delay = self.request_delay_s
        for _ in range(MAX_RETRIES):
            resp = client.get(API, params=params)
            if resp.status_code != 429:
                resp.raise_for_status()
                return resp
            retry_after = float(resp.headers.get("Retry-After", delay))
            time.sleep(max(retry_after, delay))
            delay *= 2
        resp.raise_for_status()
        return resp

    def _is_accessory(self, product: dict) -> bool:
        slugs = " ".join(
            (c.get("slug") or "").lower() for c in product.get("categories", [])
        )
        return any(marker in slugs for marker in ACCESSORY_MARKERS)

    def _parse_product(self, product: dict) -> RawOffer | None:
        title = (product.get("name") or "").strip()
        if len(title) < 3:
            return None

        prices = product.get("prices") or {}
        raw_price = prices.get("price")
        if raw_price is None:
            return None
        minor = int(prices.get("currency_minor_unit") or 0)
        price = float(raw_price) / (10 ** minor)
        if price <= 0:
            return None

        image_urls = [
            img["src"] for img in product.get("images", []) if img.get("src")
        ][:6]
        image_url = image_urls[0] if image_urls else None

        attrs: dict = {}
        storage_end: int | None = None
        spec = SPEC_RE.search(title)
        if spec:
            attrs["storage_gb"] = int(spec.group(1))
            attrs["ram_gb"] = int(spec.group(2))
            storage_end = spec.end()
        else:
            m = STORAGE_ONLY_RE.search(title)  # iPhone-style single storage
            if m:
                value = int(m.group(1))
                if m.group(2).lower() == "tb":
                    value *= 1024
                attrs["storage_gb"] = value
                storage_end = m.end()
        color = self._color_from_title(title, storage_end)
        if color:
            attrs["color"] = color

        return RawOffer(
            url=product.get("permalink") or f"{BASE}/?p={product.get('id')}",
            title=title,
            price=price,
            in_stock=bool(product.get("is_in_stock", True)),
            brand=self._detect_brand(product, title),
            warranty_type="OFFICIAL_LOCAL",
            # NB: WooCommerce `sku` is a store-internal code, not a manufacturer
            # model number — deliberately not used as model_number (would risk
            # spurious exact matches). Matching relies on title token overlap.
            attrs=attrs,
            image_url=image_url,
            image_urls=image_urls,
        )

    def _detect_brand(self, product: dict, title: str) -> str | None:
        for c in product.get("categories", []):
            slug = (c.get("slug") or "").lower()
            for key, brand in KNOWN_BRANDS.items():
                if slug.startswith(key):
                    return brand
        lowered = title.lower()
        for key, brand in KNOWN_BRANDS.items():
            if key in lowered:
                return brand
        return None

    def _color_from_title(self, title: str, storage_end: int | None) -> str | None:
        # Colour is the trailing text after the storage token, minus the network
        # tag and a lone trailing "G" (region marker Miami uses, e.g. "BLUE G").
        tail = title[storage_end:] if storage_end is not None else title
        tail = NETWORK_RE.sub(" ", tail)
        tail = re.sub(r"\b[gG]\b", " ", tail)  # drop the standalone "G" marker
        tail = re.sub(r"[^A-Za-z؀-ۿ ]", " ", tail)  # keep letters only
        words = [w for w in tail.split() if len(w) > 1]
        if not words or len(words) > 3:
            return None
        return " ".join(words).lower()
