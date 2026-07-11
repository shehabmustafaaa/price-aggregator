"""Scraper entry point.

Usage:
  python main.py dream2000            # scrape Dream2000 and POST to ingest
  python main.py mock                 # mock data end-to-end test
  python main.py mock --price-shift -500
  python main.py dream2000 --dry-run  # print instead of POSTing

Scheduling (aaPanel/cron later): run this per store on a cron interval.
"""

import argparse
import dataclasses
import json
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

from adapters.dream2000 import Dream2000Adapter
from adapters.mock_store import MockStoreAdapter
from core import ingest_client


def build_adapter(name: str, price_shift: float):
    if name == "dream2000":
        return Dream2000Adapter()
    if name == "mock":
        return MockStoreAdapter(price_shift=price_shift)
    raise SystemExit(f"Unknown store adapter: {name}")


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("store", help="dream2000 | mock")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--price-shift", type=float, default=0.0)
    args = parser.parse_args()

    adapter = build_adapter(args.store, args.price_shift)
    run_started_at = datetime.now(timezone.utc)

    print(f"[{run_started_at:%H:%M:%S}] scraping {args.store}...")
    results = adapter.scrape()

    for result in results:
        print(
            f"  {result.category_slug}: {len(result.offers)} offers, "
            f"{result.parse_errors} parse errors"
        )
        if args.dry_run:
            for offer in result.offers[:10]:
                print("   ", json.dumps(dataclasses.asdict(offer), ensure_ascii=False)[:180])
            continue
        response = ingest_client.submit(result, run_started_at)
        print(f"  ingest: {json.dumps(response)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
