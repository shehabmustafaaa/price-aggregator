"""Shared data shapes. RawOffer mirrors web/src/lib/ingest/schema.ts."""

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class RawOffer:
    url: str
    title: str
    price: float
    shipping_cost: Optional[float] = None
    currency: str = "EGP"
    in_stock: bool = True
    condition: str = "NEW"  # NEW | USED | REFURBISHED
    warranty_type: str = "UNKNOWN"  # OFFICIAL_LOCAL | IMPORTED | UNKNOWN
    region_version: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    attrs: dict[str, Any] = field(default_factory=dict)
    image_url: Optional[str] = None


@dataclass
class ScrapeResult:
    store_slug: str
    category_slug: str
    offers: list[RawOffer]
    parse_errors: int = 0
