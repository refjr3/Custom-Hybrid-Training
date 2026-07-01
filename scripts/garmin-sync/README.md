# Garmin Connect sync (personal / dev only)

This folder is a **standalone Python tool**. It does not run inside the React app and does not affect `npm run build`.

It pulls your Garmin Connect wellness data (HRV, resting heart rate, sleep stages, Body Battery, stress, activities) and writes it to Supabase `unified_metrics` with `source: 'garmin'`.

---

## What you need first

1. **Python 3.10+** installed on your computer  
   - Mac: usually already there, or install from [python.org](https://www.python.org/downloads/)
2. **Your Garmin Connect email and password**
3. **Supabase URL and service key** — the same values in your `.env.production` file for this project

---

## One-time setup (do this once)

### Step 1 — Open Terminal

- **Mac:** open the **Terminal** app (Spotlight → type “Terminal”)
- **Windows:** open **PowerShell** or **Command Prompt**

### Step 2 — Go to this folder

Copy and paste (adjust the path if your repo lives somewhere else):

```bash
cd /path/to/your/repo/scripts/garmin-sync
```

### Step 3 — Create a virtual environment

```bash
python3 -m venv .venv
```

Activate it:

- **Mac / Linux:**
  ```bash
  source .venv/bin/activate
  ```
- **Windows:**
  ```bash
  .venv\Scripts\activate
  ```

You should see `(.venv)` at the start of your terminal line.

### Step 4 — Install Python packages

```bash
pip install -r requirements.txt
```

### Step 5 — Create your secret `.env` file

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in:

| Variable | What to put |
|----------|-------------|
| `GARMIN_EMAIL` | Your Garmin Connect login email |
| `GARMIN_PASSWORD` | Your Garmin Connect password |
| `SUPABASE_URL` | From `.env.production` |
| `SUPABASE_SERVICE_KEY` | From `.env.production` (service role key, not the anon key) |

**Important:** `.env` is gitignored. Never commit it or paste these values into chat.

Optional:

- `SYNC_USER_ID` — defaults to your account (`5285440e-a3dd-4f29-9b09-29715f0a04fc`)
- `SYNC_DAYS` — how many days to pull (default `30`)

### Step 6 — Run the database migration (once)

In the **Supabase dashboard** → **SQL Editor**, run the file:

`migrations/040_garmin_wellness_columns.sql`

This adds `body_battery` and `stress_level` columns if they are not already there. Sleep stage columns already exist from an earlier migration.

---

## Every time you want fresh Garmin data

Make sure your virtual environment is active (`source .venv/bin/activate`), then:

```bash
python sync.py
```

**First run only:** Garmin may ask for an MFA code in the terminal. After that, your session is saved in `.garth/` (also gitignored) so you usually will not need to log in again.

To sync a different range:

```bash
python sync.py --days 14
python sync.py --days 7 --end 2026-06-28
```

To skip activities (wellness only):

```bash
python sync.py --skip-activities
```

---

## Check that it worked

```bash
python verify.py
```

This prints your 3 most recent `garmin` rows and a resolver-style preview (what Lab Connect’s `get_recent_recovery` uses for HRV, resting HR, sleep, and Body Battery readiness).

---

## Where data goes

| Destination | Source tag | Contents |
|-------------|------------|----------|
| `unified_metrics` | `garmin` | HRV (rmssd), resting HR, sleep total + stages, Body Battery, stress, activity minutes |
| `unified_metrics` | `garmin_body_battery` | Body Battery at wake → `readiness_score` (for the resolver) |
| `garmin_activities` | `garmin` | Recent workouts |

Re-runs **upsert** on `(user_id, date, source)` — no duplicate rows.

---

## Security notes

- Credentials come **only** from environment variables / `.env` (gitignored).
- The script never prints your password or Garmin tokens.
- This is for **your account only** — not wired into the production app UI.

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| `Missing GARMIN_EMAIL` | Create `.env` from `.env.example` and fill in Garmin credentials |
| `Missing SUPABASE_URL` | Copy values from repo root `.env.production` into `scripts/garmin-sync/.env` |
| MFA prompt | Enter the code Garmin emails/texts you |
| Column errors on upsert | Run `migrations/040_garmin_wellness_columns.sql` in Supabase |
| Stale session | Delete `.garth/` and run again (you will log in fresh) |

---

## Files in this folder

| File | Purpose |
|------|---------|
| `sync.py` | Main sync script |
| `verify.py` | Print sample rows after a sync |
| `requirements.txt` | Python dependencies |
| `.env.example` | Template for secrets (copy to `.env`) |
| `.garth/` | Cached Garmin session (created automatically, gitignored) |
| `.venv/` | Python virtual environment (you create this, gitignored) |
