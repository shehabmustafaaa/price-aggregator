"""Adapter contract (PLAN.md guardrail #9): one adapter per store,
isolated failures, per-store config. A new store = a new module here."""

from typing import Protocol

from .models import ScrapeResult


class StoreAdapter(Protocol):
    store_slug: str

    def scrape(self) -> list[ScrapeResult]:
        """Fetch all configured categories; one ScrapeResult per category."""
        ...
