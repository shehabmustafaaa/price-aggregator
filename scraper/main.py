"""Scraper entry point.

Usage:
  python main.py dream2000            # one-shot scrape + ingest
  python main.py mock                 # mock data end-to-end test
  python main.py mock --price-shift -500
  python main.py dream2000 --dry-run  # print instead of POSTing
  python main.py daemon               # poll the web app for jobs (manual
                                      # "Run now" + per-store schedules from
                                      # /admin/scraper) and run them

On the server, run `python main.py daemon` under pm2/systemd.
"""

import argparse
import dataclasses
import json
import sys
import time
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv

from adapters.dream2000 import Dream2000Adapter
from adapters.mock_store import MockStoreAdapter
from core import ingest_client


def build_adapter(name: str, price_shift: float = 0.0, request_delay_s: float | None = None):
    if name == "dream2000":
        return Dream2000Adapter(request_delay_s=request_delay_s)
    if name in ("mock", "mock-store"):
        return MockStoreAdapter(price_shift=price_shift)
    raise SystemExit(f"Unknown store adapter: {name}")


def run_adapter(adapter, dry_run: bool) -> None:
    run_started_at = datetime.now(timezone.utc)
    print(f"[{run_started_at:%H:%M:%S}] scraping {adapter.store_slug}...")
    results = adapter.scrape()
    for result in results:
        print(
            f"  {result.category_slug}: {len(result.offers)} offers, "
            f"{result.parse_errors} parse errors"
        )
        if dry_run:
            for offer in result.offers[:10]:
                print("   ", json.dumps(dataclasses.asdict(offer), ensure_ascii=False)[:180])
            continue
        response = ingest_client.submit(result, run_started_at)
        print(f"  ingest: {json.dumps(response)}")


def daemon(poll_seconds: int) -> int:
    import os

    base = os.environ["INGEST_URL"].rsplit("/api/", 1)[0]
    headers = {"x-ingest-secret": os.environ["INGEST_SECRET"]}
    print(f"daemon started, polling {base} every {poll_seconds}s")

    while True:
        try:
            resp = httpx.post(f"{base}/api/scraper/claim", headers=headers, timeout=30)
            resp.raise_for_status()
            job = resp.json().get("job")
        except Exception as exc:
            print(f"claim failed: {exc}")
            time.sleep(poll_seconds)
            continue

        if not job:
            time.sleep(poll_seconds)
            continue

        job_id = job["jobId"]
        print(f"job #{job_id}: {job['storeSlug']} (delay {job['requestDelaySeconds']}s)")
        status, note = "DONE", None
        try:
            adapter = build_adapter(
                job["storeSlug"], request_delay_s=job["requestDelaySeconds"]
            )
            run_adapter(adapter, dry_run=False)
        except Exception as exc:
            status, note = "FAILED", str(exc)[:400]
            print(f"job #{job_id} failed: {exc}")
        try:
            httpx.post(
                f"{base}/api/scraper/complete",
                headers=headers,
                json={"job_id": job_id, "status": status}
                | ({"note": note} if note else {}),
                timeout=30,
            ).raise_for_status()
        except Exception as exc:
            print(f"complete report failed: {exc}")


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("store", help="dream2000 | mock | daemon")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--price-shift", type=float, default=0.0)
    parser.add_argument("--poll", type=int, default=30, help="daemon poll seconds")
    args = parser.parse_args()

    if args.store == "daemon":
        return daemon(args.poll)

    run_adapter(build_adapter(args.store, args.price_shift), args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
