"""POSTs scrape results to the web app's /api/ingest (guardrail: the
scraper never touches the database directly)."""

import dataclasses
import os
from datetime import datetime, timezone

import httpx

from .models import ScrapeResult


def submit(result: ScrapeResult, run_started_at: datetime) -> dict:
    ingest_url = os.environ["INGEST_URL"]
    secret = os.environ["INGEST_SECRET"]

    payload = {
        "store_slug": result.store_slug,
        "category_slug": result.category_slug,
        "run_started_at": run_started_at.astimezone(timezone.utc).isoformat(),
        "parse_errors": result.parse_errors,
        "offers": [dataclasses.asdict(o) for o in result.offers],
    }

    response = httpx.post(
        ingest_url,
        json=payload,
        headers={"x-ingest-secret": secret},
        timeout=120,
    )
    response.raise_for_status()
    return response.json()
