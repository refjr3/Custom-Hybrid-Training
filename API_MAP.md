# API surface map

Vercel maps `api/**/*.js` to `/api/<path>` (default export = handler). This table reflects static analysis of `src/` call sites (grep), handler auth checks, and outbound fetches.

**Legend — Auth:** `Bearer` = `Authorization: Bearer <jwt>` (or same token via `getAccessTokenFromRequest`); `cookie` = integration session cookie; `secret` = shared `?secret=` query param; `none` = public or redirect-only entry.

| Route | Status | Calls from `src/` | Auth | External / notes |
|-------|--------|-------------------|------|------------------|
| `/api/auth/login` | active | `TodayDrawer.jsx`, `Onboarding.jsx` | none (redirect) | WHOOP OAuth authorize |
| `/api/auth/callback` | active | browser redirect | none (OAuth `code`) | WHOOP token + sets cookies |
| `/api/auth/me` | active | *(none — dev/ops utility)* | Bearer | Supabase `getUser` only |
| `/api/auth/garmin-login` | deferred | none | none (redirect) | Garmin OAuth (program closed for new apps) |
| `/api/auth/garmin-callback` | deferred | none | none (OAuth `code`) | Garmin token + profile write |
| `/api/auth/strava-login` | active | *(re-export → strava/login)* | none | same as `/api/strava/login` |
| `/api/auth/strava-callback` | active | *(re-export → strava/callback)* | none | same as `/api/strava/callback` |
| `/api/strava/login` | active | `App.jsx`, `TodayDrawer.jsx` | none (redirect) | Strava OAuth authorize |
| `/api/strava/callback` | active | OAuth redirect | none | Strava token exchange + DB |
| `/api/strava/refresh` | reserved | *(not wired from UI; refresh path)* | Strava `strava_refresh` cookie | Strava `oauth/token` — aligns with in-process refresh via `tokenCookies.js` |
| `/api/strava/best-efforts` | active | `App.jsx` | Bearer | Strava REST |
| `/api/strava/weekly-z2` | active | `App.jsx` | Bearer | Strava REST + streams |
| `/api/whoop/sync` | active | `App.jsx` | `getAccessTokenFromRequest` | WHOOP API (via `whoop/lib`) |
| `/api/whoop/recovery` | active | `App.jsx` | WHOOP cookies (+ optional Bearer for unified upsert) | WHOOP API + Supabase |
| `/api/intervals/sync` | active | `App.jsx` | Bearer | Intervals.icu REST |
| `/api/intervals/test` | debug-only | none | none (uses server env key) | Intervals.icu wellness sample |
| `/api/metrics/today` | reserved | *(Phase 5 — not wired from UI yet)* | `getAccessTokenFromRequest` | Supabase + `resolver.js` |
| `/api/metrics/range` | active | `App.jsx` (temp TEST WEEK) | `getAccessTokenFromRequest` | Supabase + `resolver.js` |
| `/api/metrics/trends` | active | `App.jsx` | Bearer | Supabase (`unified_metrics`, `garmin_activities`) |
| `/api/metrics/seed-biomarkers` | debug-only | none | `secret` query | Supabase upsert demo biomarkers |
| `/api/plan/generate` | active | `PlanBuilder.jsx` | Bearer | Anthropic Messages + Supabase writes |
| `/api/plan/days` | active | `App.jsx` | Bearer | Supabase read |
| `/api/plan/update` | active | `App.jsx` | Bearer | Supabase write |
| `/api/plan/seed-20week` | ops | scripts / manual | secret | Supabase seed |
| `/api/plan/seed-12week` | ops | *(delegates to seed-20week)* | secret | Legacy alias URL |
| `/api/coach/chat` | active | `App.jsx` | Bearer optional + body `user_id` fallback | Anthropic + Supabase |
| `/api/coaching/proactive` | active | `App.jsx` | Bearer | Anthropic (weekly review path) |
| `/api/synthesis/morning` | active | `App.jsx` | Bearer | Anthropic + optional Supabase day update |
| `/api/supplements/update` | active | `App.jsx` | Bearer | Supabase |
| `/api/bloodwork/extract` | active | `App.jsx` | Bearer | Anthropic vision/text |
| `/api/garmin/activities` | deferred | none | Bearer + Garmin cookies | Garmin Connect API |
| `/api/debug/env` | debug-only | none | none | returns env presence (sensitive ops) |
| `/api/debug/strava-env` | debug-only | none | none | returns Strava env metadata |
| `api/metrics/resolver.js` | internal | *(imported by today/range only)* | n/a | **Not** a supported HTTP handler (no default export). |

### Deprecated / debug `console.warn`

Handlers for **deferred Garmin**, **`api/debug/*`**, **`api/intervals/test`**, and **`api/metrics/seed-biomarkers`** log `[DEPRECATED]` on each request so Vercel logs surface unexpected traffic.
