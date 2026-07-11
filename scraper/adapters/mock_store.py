"""Mock adapter for end-to-end pipeline tests without hitting any real site.
Register a `mock-store` Store row before using (see README)."""

from core.models import RawOffer, ScrapeResult


class MockStoreAdapter:
    store_slug = "mock-store"

    def __init__(self, price_shift: float = 0.0):
        # Shift prices to simulate drops/rises between runs.
        self.price_shift = price_shift

    def scrape(self) -> list[ScrapeResult]:
        offers = [
            RawOffer(
                url="https://mock.example/products/galaxy-s25-ultra-256",
                title="Samsung Galaxy S25 Ultra 256GB 12GB RAM 5G",
                price=63500 + self.price_shift,
                brand="Samsung",
                model_number="SM-S938",
                warranty_type="OFFICIAL_LOCAL",
                attrs={"storage_gb": 256},
            ),
            RawOffer(
                url="https://mock.example/products/iphone-16-128",
                title="Apple iPhone 16 128GB",
                price=55200 + self.price_shift,
                brand="Apple",
                warranty_type="IMPORTED",
                region_version="GLOBAL",
                attrs={"storage_gb": 128},
            ),
            RawOffer(
                url="https://mock.example/products/unknown-phone",
                title="SuperPhone X9000 Max Unknown",
                price=9999,
                attrs={},
            ),
        ]
        return [
            ScrapeResult(
                store_slug=self.store_slug,
                category_slug="mobile-phones",
                offers=offers,
            )
        ]
