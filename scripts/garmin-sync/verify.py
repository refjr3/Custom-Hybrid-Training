#!/usr/bin/env python3
"""Print recent garmin unified_metrics rows and resolver-style recovery preview."""

from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc"

PRIORITIES = {
    "readiness": ["whoop", "oura", "garmin_body_battery", "apple_health", "manual"],
    "hrv": ["whoop", "oura", "garmin", "apple_health"],
    "resting_hr": ["whoop", "oura", "garmin", "apple_health"],
    "sleep": ["oura", "whoop", "garmin", "apple_health", "manual"],
}
METRIC_FIELDS = {
    "readiness": ["readiness_score", "readiness_color"],
    "hrv": ["hrv_rmssd"],
    "resting_hr": ["resting_hr"],
    "sleep": [
        "sleep_total_min",
        "sleep_score",
        "sleep_deep_min",
        "sleep_rem_min",
        "sleep_light_min",
        "sleep_awake_min",
        "body_battery",
        "stress_level",
    ],
}


def load_environment() -> None:
    for env_path in (SCRIPT_DIR / ".env", REPO_ROOT / ".env.production", REPO_ROOT / ".env"):
        if env_path.is_file():
            load_dotenv(env_path, override=False)


def resolve_day(day: date, source_map: dict[str, dict]) -> dict:
    iso = day.isoformat()
    row: dict = {"date": iso, "sources_used": {}}
    for metric, order in PRIORITIES.items():
        fields = METRIC_FIELDS[metric]
        for source in order:
            src = source_map.get(source)
            if not src:
                continue
            if any(src.get(f) is not None for f in fields):
                for f in fields:
                    if src.get(f) is not None:
                        row[f] = src[f]
                row["sources_used"][metric] = source
                break
    return row


def main() -> int:
    load_environment()
    user_id = os.environ.get("SYNC_USER_ID", DEFAULT_USER_ID).strip() or DEFAULT_USER_ID
    days = int(os.environ.get("VERIFY_DAYS", "7"))
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in scripts/garmin-sync/.env", file=sys.stderr)
        return 1

    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days - 1)
    supabase = create_client(url, key)

    response = (
        supabase.table("unified_metrics")
        .select(
            "date, source, hrv_rmssd, resting_hr, sleep_total_min, sleep_deep_min, "
            "sleep_rem_min, sleep_light_min, sleep_awake_min, body_battery, stress_level, "
            "readiness_score, total_activity_min, steps, updated_at"
        )
        .eq("user_id", user_id)
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
        .order("date", desc=True)
        .execute()
    )
    rows = response.data or []

    garmin_rows = [r for r in rows if r.get("source") == "garmin"]
    print(f"Garmin rows in last {days} days: {len(garmin_rows)}")
    print("")
    print("=== 3 most recent garmin days (raw) ===")
    for row in garmin_rows[:3]:
        print(json.dumps(row, indent=2, default=str))
        print("")

    by_date: dict[str, dict[str, dict]] = {}
    for row in rows:
        dk = str(row.get("date", ""))[:10]
        by_date.setdefault(dk, {})[str(row.get("source"))] = row

    print("=== Resolver-style recovery preview (last 3 days) ===")
    preview_days = sorted(by_date.keys(), reverse=True)[:3]
    for dk in sorted(preview_days):
        resolved = resolve_day(date.fromisoformat(dk), by_date[dk])
        print(json.dumps(resolved, indent=2, default=str))
        print("")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
