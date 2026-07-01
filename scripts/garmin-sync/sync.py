#!/usr/bin/env python3
"""
Personal/dev Garmin Connect → Supabase unified_metrics sync via garth-ng.

Credentials only from environment variables. Never log passwords or tokens.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict, is_dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import garth
from dotenv import load_dotenv
from supabase import Client, create_client

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc"
DEFAULT_DAYS = 30
GARMIN_SOURCE = "garmin"
BODY_BATTERY_SOURCE = "garmin_body_battery"


def load_environment() -> None:
    """Load secrets from local .env files (gitignored)."""
    for env_path in (
        SCRIPT_DIR / ".env",
        REPO_ROOT / ".env.production",
        REPO_ROOT / ".env",
    ):
        if env_path.is_file():
            load_dotenv(env_path, override=False)


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def optional_int(value: str | None, default: int) -> int:
    if not value or not str(value).strip():
        return default
    try:
        parsed = int(value)
        return parsed if parsed > 0 else default
    except ValueError:
        return default


def iso_today() -> date:
    return datetime.now(timezone.utc).date()


def date_range_days(end: date, days: int) -> list[date]:
    start = end - timedelta(days=days - 1)
    out: list[date] = []
    cursor = start
    while cursor <= end:
        out.append(cursor)
        cursor += timedelta(days=1)
    return out


def to_jsonable(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if is_dataclass(value):
        return to_jsonable(asdict(value))
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(v) for v in value]
    return value


def seconds_to_minutes(seconds: int | float | None) -> float | None:
    if seconds is None:
        return None
    try:
        n = float(seconds)
    except (TypeError, ValueError):
        return None
    if not n or n < 0:
        return None
    return round(n / 60.0, 1)


def finite_number(value: Any) -> float | int | None:
    if value is None:
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if not n == n:  # NaN
        return None
    if abs(n) == float("inf"):
        return None
    if float(n).is_integer():
        return int(n)
    return round(n, 2)


def configure_garth() -> None:
    token_dir = SCRIPT_DIR / ".garth"
    token_dir.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("GARTH_HOME", str(token_dir))
    garth.configure(storage=garth.FileTokenStorage(str(token_dir)))


def ensure_garth_login() -> None:
    configure_garth()
    email = os.environ.get("GARMIN_EMAIL", "").strip()
    password = os.environ.get("GARMIN_PASSWORD", "").strip()

    try:
        if garth.client.username:
            return
    except Exception:
        pass

    if not email or not password:
        raise SystemExit(
            "Garmin session not found. Set GARMIN_EMAIL and GARMIN_PASSWORD "
            "in scripts/garmin-sync/.env for the first login."
        )

    print("Logging in to Garmin Connect (session will be cached in .garth/)...")
    garth.login(
        email,
        password,
        prompt_mfa=lambda: input("Garmin MFA code: ").strip(),
    )
    print("Garmin login successful. Future runs reuse the cached session.")


def index_by_date(items: list[Any], attr: str = "calendar_date") -> dict[date, Any]:
    out: dict[date, Any] = {}
    for item in items or []:
        key = getattr(item, attr, None)
        if isinstance(key, date):
            out[key] = item
    return out


def index_sleep(items: list[Any]) -> dict[date, Any]:
    out: dict[date, Any] = {}
    for item in items or []:
        dto = getattr(item, "daily_sleep_dto", None)
        key = getattr(dto, "calendar_date", None) if dto else None
        if isinstance(key, date):
            out[key] = item
    return out


def build_wellness_row(
    user_id: str,
    day: date,
    *,
    hrv: Any | None,
    heart_rate: Any | None,
    sleep: Any | None,
    summary: Any | None,
    stress: Any | None,
) -> dict[str, Any]:
    sleep_dto = getattr(sleep, "daily_sleep_dto", None) if sleep else None
    sleep_scores = getattr(sleep_dto, "sleep_scores", None) if sleep_dto else None
    overall_score = getattr(getattr(sleep_scores, "overall", None), "value", None)

    hrv_rmssd = finite_number(getattr(hrv, "last_night_avg", None) if hrv else None)
    resting_hr = finite_number(
        getattr(heart_rate, "resting_heart_rate", None)
        if heart_rate
        else getattr(summary, "resting_heart_rate", None) if summary else None
    )

    sleep_total_min = seconds_to_minutes(
        getattr(sleep_dto, "sleep_time_seconds", None) if sleep_dto else None
    )
    if sleep_total_min is None and summary is not None:
        sleep_total_min = seconds_to_minutes(getattr(summary, "sleeping_seconds", None))

    body_battery = finite_number(
        getattr(summary, "body_battery_at_wake_time", None) if summary else None
    )
    stress_level = finite_number(
        getattr(stress, "overall_stress_level", None)
        if stress
        else getattr(summary, "average_stress_level", None) if summary else None
    )

    active_seconds = getattr(summary, "active_seconds", None) if summary else None
    total_activity_min = seconds_to_minutes(active_seconds)

    raw_payload: dict[str, Any] = {}
    if hrv is not None:
        raw_payload["hrv"] = to_jsonable(hrv)
    if heart_rate is not None:
        raw_payload["heart_rate"] = {
            "resting_heart_rate": getattr(heart_rate, "resting_heart_rate", None),
            "min_heart_rate": getattr(heart_rate, "min_heart_rate", None),
            "max_heart_rate": getattr(heart_rate, "max_heart_rate", None),
        }
    if sleep_dto is not None:
        raw_payload["sleep"] = to_jsonable(sleep_dto)
    if summary is not None:
        raw_payload["daily_summary"] = to_jsonable(summary)
    if stress is not None:
        raw_payload["stress"] = to_jsonable(stress)

    row: dict[str, Any] = {
        "user_id": user_id,
        "date": day.isoformat(),
        "source": GARMIN_SOURCE,
        "hrv_rmssd": hrv_rmssd,
        "resting_hr": resting_hr,
        "sleep_total_min": sleep_total_min,
        "sleep_score": finite_number(overall_score),
        "sleep_deep_min": seconds_to_minutes(
            getattr(sleep_dto, "deep_sleep_seconds", None) if sleep_dto else None
        ),
        "sleep_rem_min": seconds_to_minutes(
            getattr(sleep_dto, "rem_sleep_seconds", None) if sleep_dto else None
        ),
        "sleep_light_min": seconds_to_minutes(
            getattr(sleep_dto, "light_sleep_seconds", None) if sleep_dto else None
        ),
        "sleep_awake_min": seconds_to_minutes(
            getattr(sleep_dto, "awake_sleep_seconds", None) if sleep_dto else None
        ),
        "body_battery": body_battery,
        "stress_level": stress_level,
        "total_activity_min": total_activity_min,
        "steps": finite_number(getattr(summary, "total_steps", None) if summary else None),
        "active_calories": finite_number(
            getattr(summary, "active_kilocalories", None) if summary else None
        ),
        "raw_payload": raw_payload or None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    return {k: v for k, v in row.items() if v is not None or k in ("user_id", "date", "source")}


def build_body_battery_row(user_id: str, day: date, summary: Any | None) -> dict[str, Any] | None:
    if summary is None:
        return None
    score = finite_number(getattr(summary, "body_battery_at_wake_time", None))
    if score is None:
        return None
    return {
        "user_id": user_id,
        "date": day.isoformat(),
        "source": BODY_BATTERY_SOURCE,
        "readiness_score": score,
        "raw_payload": {
            "body_battery_at_wake": score,
            "body_battery_highest": getattr(summary, "body_battery_highest_value", None),
            "body_battery_lowest": getattr(summary, "body_battery_lowest_value", None),
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def activity_in_range(activity: Any, start: date, end: date) -> bool:
    ts = getattr(activity, "start_time_local", None) or getattr(activity, "start_time_gmt", None)
    if ts is None:
        return False
    if isinstance(ts, datetime):
        day = ts.date()
    else:
        try:
            day = date.fromisoformat(str(ts)[:10])
        except ValueError:
            return False
    return start <= day <= end


def map_activity(user_id: str, activity: Any) -> dict[str, Any]:
    summary = getattr(activity, "summary", None)
    start = (
        getattr(activity, "start_time_local", None)
        or getattr(activity, "start_time_gmt", None)
        or (getattr(summary, "start_time_local", None) if summary else None)
    )
    start_iso = start.isoformat() if isinstance(start, datetime) else None
    day_str = start.date().isoformat() if isinstance(start, datetime) else None

    duration = (
        getattr(activity, "duration", None)
        or getattr(activity, "moving_duration", None)
        or getattr(activity, "elapsed_duration", None)
        or (getattr(summary, "duration", None) if summary else None)
        or (getattr(summary, "moving_duration", None) if summary else None)
    )
    distance = (
        getattr(activity, "distance", None)
        or (getattr(summary, "distance", None) if summary else None)
    )
    avg_hr = (
        getattr(activity, "average_hr", None)
        or (getattr(summary, "average_hr", None) if summary else None)
    )
    max_hr = (
        getattr(activity, "max_hr", None)
        or (getattr(summary, "max_hr", None) if summary else None)
    )
    calories = (
        getattr(activity, "calories", None)
        or (getattr(summary, "calories", None) if summary else None)
    )
    activity_type = getattr(getattr(activity, "activity_type", None), "type_key", None) or "workout"
    name = getattr(activity, "activity_name", None) or activity_type

    return {
        "user_id": user_id,
        "activity_id": str(getattr(activity, "activity_id", "")),
        "activity_type": activity_type,
        "activity_name": name,
        "name": name,
        "date": day_str,
        "start_time": start_iso,
        "duration_seconds": int(round(float(duration))) if duration else 0,
        "distance_meters": finite_number(distance) or 0,
        "avg_hr": finite_number(avg_hr),
        "max_hr": finite_number(max_hr),
        "calories": int(round(float(calories))) if calories else None,
        "source": GARMIN_SOURCE,
        "raw_data": to_jsonable(activity),
    }


def fetch_garmin_data(days: int, end: date) -> dict[str, Any]:
    print(f"Fetching Garmin wellness for {days} days ending {end.isoformat()}...")

    hrv_list = garth.DailyHRV.list(end=end, period=days)
    stress_list = garth.DailyStress.list(end=end, period=days)
    summaries = garth.DailySummary.list(end=end, days=days)
    sleep_list = garth.SleepData.list(end=end, days=days)
    heart_rates = garth.DailyHeartRate.list(end=end, days=days)

    return {
        "hrv": index_by_date(hrv_list),
        "stress": index_by_date(stress_list),
        "summary": index_by_date(summaries),
        "sleep": index_sleep(sleep_list),
        "heart_rate": index_by_date(heart_rates),
    }


def fetch_activities(start: date, end: date, page_size: int = 50) -> list[Any]:
    print("Fetching Garmin activities...")
    collected: list[Any] = []
    offset = 0
    while True:
        batch = garth.Activity.list(limit=page_size, start=offset)
        if not batch:
            break
        in_range = [a for a in batch if activity_in_range(a, start, end)]
        collected.extend(in_range)
        oldest = min(
            (
                (getattr(a, "start_time_local", None) or getattr(a, "start_time_gmt", None)).date()
                for a in batch
                if getattr(a, "start_time_local", None) or getattr(a, "start_time_gmt", None)
            ),
            default=None,
        )
        if oldest is not None and oldest < start:
            break
        if len(batch) < page_size:
            break
        offset += page_size
    return collected


def upsert_rows(supabase: Client, table: str, rows: list[dict[str, Any]], on_conflict: str) -> int:
    if not rows:
        return 0

    optional_columns = ("body_battery", "stress_level", "sleep_score", "raw_payload", "name", "date", "activity_name")
    payload = rows

    for attempt in range(3):
        try:
            response = (
                supabase.table(table)
                .upsert(payload, on_conflict=on_conflict)
                .execute()
            )
            return len(response.data or payload)
        except Exception as exc:
            message = str(exc).lower()
            stripped_col = None
            for col in optional_columns:
                if col in message and ("column" in message or "could not find" in message):
                    stripped_col = col
                    break
            if stripped_col and attempt < 2:
                payload = [{k: v for k, v in row.items() if k != stripped_col} for row in payload]
                print(f"Retrying upsert without column '{stripped_col}' (run migrations if needed).")
                continue
            raise

    return 0


def sync_wellness(
    supabase: Client,
    user_id: str,
    days: int,
    end: date,
    data: dict[str, Any],
) -> tuple[int, int]:
    wellness_rows: list[dict[str, Any]] = []
    body_battery_rows: list[dict[str, Any]] = []

    for day in date_range_days(end, days):
        row = build_wellness_row(
            user_id,
            day,
            hrv=data["hrv"].get(day),
            heart_rate=data["heart_rate"].get(day),
            sleep=data["sleep"].get(day),
            summary=data["summary"].get(day),
            stress=data["stress"].get(day),
        )
        if any(
            row.get(field) is not None
            for field in (
                "hrv_rmssd",
                "resting_hr",
                "sleep_total_min",
                "sleep_deep_min",
                "body_battery",
                "stress_level",
            )
        ):
            wellness_rows.append(row)

        bb_row = build_body_battery_row(user_id, day, data["summary"].get(day))
        if bb_row:
            body_battery_rows.append(bb_row)

    garmin_count = upsert_rows(supabase, "unified_metrics", wellness_rows, "user_id,date,source")
    bb_count = upsert_rows(supabase, "unified_metrics", body_battery_rows, "user_id,date,source")
    return garmin_count, bb_count


def sync_activities(supabase: Client, user_id: str, start: date, end: date) -> int:
    activities = fetch_activities(start, end)
    rows = [map_activity(user_id, a) for a in activities if getattr(a, "activity_id", None)]
    rows = [r for r in rows if r.get("activity_id")]
    return upsert_rows(supabase, "garmin_activities", rows, "activity_id")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync Garmin Connect data to Supabase.")
    parser.add_argument(
        "--days",
        type=int,
        default=None,
        help=f"Number of days to sync (default: SYNC_DAYS env or {DEFAULT_DAYS})",
    )
    parser.add_argument(
        "--end",
        type=str,
        default=None,
        help="End date YYYY-MM-DD (default: today UTC)",
    )
    parser.add_argument(
        "--skip-activities",
        action="store_true",
        help="Skip garmin_activities upsert",
    )
    return parser.parse_args()


def main() -> int:
    load_environment()
    args = parse_args()

    days = args.days if args.days and args.days > 0 else optional_int(os.environ.get("SYNC_DAYS"), DEFAULT_DAYS)
    end = date.fromisoformat(args.end) if args.end else iso_today()
    start = end - timedelta(days=days - 1)
    user_id = os.environ.get("SYNC_USER_ID", DEFAULT_USER_ID).strip() or DEFAULT_USER_ID

    supabase_url = require_env("SUPABASE_URL")
    supabase_key = require_env("SUPABASE_SERVICE_KEY")

    ensure_garth_login()

    supabase = create_client(supabase_url, supabase_key)
    data = fetch_garmin_data(days, end)

    garmin_count, bb_count = sync_wellness(supabase, user_id, days, end, data)
    activity_count = 0
    if not args.skip_activities:
        activity_count = sync_activities(supabase, user_id, start, end)

    print("")
    print("Sync complete.")
    print(f"  unified_metrics (source=garmin):        {garmin_count} rows upserted")
    print(f"  unified_metrics (source=garmin_body_battery): {bb_count} rows upserted")
    print(f"  garmin_activities:                      {activity_count} rows upserted")
    print(f"  date range:                             {start.isoformat()} → {end.isoformat()}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.")
        raise SystemExit(130)
