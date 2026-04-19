# Database migrations

## Fresh Supabase provisioning

Run the SQL files in **`migrations/`** in **lexicographic filename order** (000, 001, 002, …). That order matches numeric sequence: **`000_bootstrap.sql` first**, then `001` … through `024`.

**000** creates `training_blocks`, `training_weeks`, `training_days`, `garmin_activities`, and `ai_messages` with RLS enabled and **service_role–only** policies so the schema exists before **001** attaches permissive policies and **003** installs user-scoped policies.

## Duplicate-prefix cleanup (2026-04)

Previously, multiple files shared the same numeric prefix (`005`, `006`, `009`, `018`), which made lexicographic ordering ambiguous. Renames applied:

| Old name | New name |
|----------|----------|
| `005_onboarding_fields.sql` | `021_onboarding_fields.sql` |
| `006_coach_persona.sql` | `022_coach_persona.sql` |
| `009_session_blocks.sql` | `023_training_days_session_blocks.sql` |
| `018_garmin_activities_name.sql` | `024_garmin_activities_name.sql` |

`009_unified_metrics.sql` stays **009** so resolver columns stay immediately after `008_unified_metrics.sql` when files are sorted by name.

## Apply order (full chain)

| Order | File | Description |
|------:|------|-------------|
| 0 | `000_bootstrap.sql` | Creates core training + `garmin_activities` + `ai_messages`; indexes; RLS + service_role policies. |
| 1 | `001_add_user_id.sql` | Ensures `user_id` on those tables; permissive `allow_all_*` RLS policies; indexes on `user_id`. |
| 2 | `002_create_profiles.sql` | Creates `user_profiles` with RLS and `updated_at` trigger. |
| 3 | `003_tighten_rls.sql` | Replaces permissive policies with `auth.uid() = user_id` on core tables. |
| 4 | `004_custom_sessions.sql` | Adds `am_session_custom` / `pm_session_custom` on `training_days` (no-op if 000 already applied them). |
| 5 | `005_onboarding_columns.sql` | Adds `dob`, `races`, `connected_wearables`, `deload_preference` on `user_profiles`. |
| 6 | `006_add_week_order.sql` | Adds `week_order` on `training_weeks` (no-op if 000 already applied it). |
| 7 | `007_generation_status.sql` | Adds `generation_status` on `user_profiles`. |
| 8 | `008_unified_metrics.sql` | Creates `unified_metrics` + RLS; adds `metric_sources` on `user_profiles`. |
| 9 | `009_unified_metrics.sql` | Lab/resolver columns on `unified_metrics`; service-role policy; profile source prefs + onboarding flags. |
| 10 | `010_ai_messages_session_id.sql` | Adds `session_id` to `ai_messages` + index (no-op if 000 already applied `session_id`). |
| 11 | `011_user_profiles_rls.sql` | Refreshes `user_profiles` RLS policies with `WITH CHECK` on update. |
| 12 | `012_add_strava_token_columns.sql` | Strava token columns on `user_profiles`. |
| 13 | `013_intervals_unified_metrics_columns.sql` | Intervals.icu-related columns on `unified_metrics`. |
| 14 | `014_garmin_activities_source.sql` | Adds `source` on `garmin_activities` + index (no-op if 000 already applied `source`). |
| 15 | `015_unified_metrics_sleep_score.sql` | Adds `sleep_score` on `unified_metrics` (idempotent if already present from 009). |
| 16 | `016_unified_metrics_upsert_target.sql` | Ensures unique index for upsert conflict target. |
| 17 | `017_unified_metrics_ctl_tsb_guard.sql` | Adds `ctl` / `tsb` if missing (guards overlap with 013). |
| 18 | `018_garmin_activities_activity_name.sql` | Adds `activity_name` on `garmin_activities` (no-op if 000 already applied it). |
| 19 | `019_user_profiles_drawer_fields.sql` | Drawer/profile editor columns + AI tone/focus on `user_profiles`. |
| 20 | `020_user_profiles_strava_z2_cache.sql` | Strava Z2 cache columns on `user_profiles`. |
| 21 | `021_onboarding_fields.sql` | Extended onboarding columns; migrates `age` → `dob`; drops `age`. |
| 22 | `022_coach_persona.sql` | Adds `coach_persona` on `user_profiles`. |
| 23 | `023_training_days_session_blocks.sql` | Adds `am_session_blocks` / `pm_session_blocks` on `training_days` (no-op if 000 already applied them). |
| 24 | `024_garmin_activities_name.sql` | Adds `name` on `garmin_activities` (no-op if 000 already applied it). |

## Optional scripts (`supabase/`)

Not part of the numbered sequence above:

| File | Description |
|------|-------------|
| `supabase/migrate_custom_sessions.sql` | Same logical change as `004_custom_sessions.sql` (duplicate copy for manual runs). |
| `supabase/seed_supplements.sql` | Creates `supplements` table + example `INSERT` rows (includes a fixed demo `user_id`). |

## Audit notes (2026-04)

- **No duplicate `CREATE TABLE`** for the same table within `migrations/` (`unified_metrics` appears only in 008; `user_profiles` only in 002).
- **Overlapping `ALTER`s**: `ctl`/`tsb` may appear in both **013** and **017**; both use `IF NOT EXISTS`. **009** and **015** both touch `sleep_score`; **015** uses `IF NOT EXISTS`.
- **Data-affecting**: **021** runs `UPDATE` on `user_profiles` for `age`→`dob` then **`DROP COLUMN age`** (intentional migration).
- **003**: replaces policies; comment notes `user_id IS NULL` rows become invisible (not a SQL delete of user data).
