"""2B Egypt (2b.com.eg) — Magento store, fully server-rendered.
Parsed from category listing pages with parsel. Polite pacing + backoff."""

import re
import time

import httpx
from parsel import Selector

from core.models import RawOffer, ScrapeResult

BASE = "https://2b.com.eg"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
MAX_RETRIES = 4
MAX_PAGES = 30  # safety cap

# category path -> our canonical category slug
CATEGORY_MAP = {
    "mobile-and-tablet/mobiles.html": "mobile-phones",
}

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

STORAGE_RE = re.compile(r"(\d+)\s*(GB|TB)\b", re.IGNORECASE)
RAM_RE = re.compile(r"(\d+)\s*GB\s*RAM|RAM\s*(\d+)\s*GB", re.IGNORECASE)


class TwoBAdapter:
    store_slug = "2b"

    def __init__(self, request_delay_s: float | None = None):
        self.request_delay_s = request_delay_s or 5.0

    def scrape(self) -> list[ScrapeResult]:
        results = []
        with httpx.Client(
            headers={"User-Agent": USER_AGENT},
            timeout=60,
            follow_redirects=True,
        ) as client:
            for path, category_slug in CATEGORY_MAP.items():
                results.append(self._scrape_category(client, path, category_slug))
        return results

    def _scrape_category(
        self, client: httpx.Client, path: str, category_slug: str
    ) -> ScrapeResult:
        offers: list[RawOffer] = []
        parse_errors = 0
        seen_urls: set[str] = set()

        for page in range(1, MAX_PAGES + 1):
            url = f"{BASE}/en/{path}"
            resp = self._get_with_backoff(client, url, {"p": page})
            sel = Selector(text=resp.text)
            items = sel.css("li.item.product .product-item-info, .product-item-info")

            new_on_page = 0
            for item in items:
                try:
                    offer = self._parse_item(item)
                    if offer and offer.url not in seen_urls:
                        seen_urls.add(offer.url)
                        offers.append(offer)
                        new_on_page += 1
                except Exception:
                    parse_errors += 1

            # Magento repeats page 1 content for out-of-range pages.
            if new_on_page == 0:
                break
            time.sleep(self.request_delay_s)

        return ScrapeResult(
            store_slug=self.store_slug,
            category_slug=category_slug,
            offers=offers,
            parse_errors=parse_errors,
        )

    def _parse_item(self, item: Selector) -> RawOffer | None:
        link = item.css("a.product-item-link")
        if not link:
            return None
        href = (link.attrib.get("href") or "").strip()
        title = " ".join(link.css("::text").getall()).strip()
        if not href or not title:
            return None
        # "Pre Order …" listings carry a deposit amount, not a real price.
        if title.lower().startswith("pre order"):
            return None

        price_attr = item.css("[data-price-amount]::attr(data-price-amount)").get()
        if not price_attr:
            return None
        price = float(price_attr)
        if price <= 0:
            return None

        image = item.css("img.product-image-photo::attr(src)").get()
        in_stock = not bool(item.css(".stock.unavailable").get())

        attrs: dict = {}
        storage = STORAGE_RE.search(title)
        if storage:
            value = int(storage.group(1))
            if storage.group(2).upper() == "TB":
                value *= 1024
            attrs["storage_gb"] = value
        ram = RAM_RE.search(title)
        if ram:
            attrs["ram_gb"] = int(ram.group(1) or ram.group(2))
        # Titles end with the color: "… - 128GB - Ink Black"
        segments = [s.strip() for s in title.split(" - ")]
        if len(segments) >= 2 and not re.search(r"\d", segments[-1]):
            attrs["color"] = segments[-1]

        return RawOffer(
            url=href,
            title=title,
            price=price,
            in_stock=in_stock,
            brand=self._detect_brand(title),
            warranty_type="OFFICIAL_LOCAL",
            attrs=attrs,
            image_url=image if image and image.startswith("http") else None,
            image_urls=[image] if image and image.startswith("http") else [],
        )

    def _detect_brand(self, text: str) -> str | None:
        lowered = text.lower()
        for key, brand in KNOWN_BRANDS.items():
            if key in lowered:
                return brand
        return None

    def _get_with_backoff(
        self, client: httpx.Client, url: str, params: dict
    ) -> httpx.Response:
        delay = self.request_delay_s
        for _ in range(MAX_RETRIES):
            resp = client.get(url, params=params)
            if resp.status_code not in (429, 503):
                resp.raise_for_status()
                return resp
            retry_after = float(resp.headers.get("Retry-After", delay))
            time.sleep(max(retry_after, delay))
            delay *= 2
        resp.raise_for_status()
        return resp
